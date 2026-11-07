import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import { cleanText, isEmail } from './sanitize.mjs'

/**
 * Zgłoszenia z aplikacji (Android, iOS, Windows).
 *
 * Dwa niezależne zbiory, każdy z własną zakładką w panelu:
 *  - `bug-reports.json` – raporty o błędach: awarie zebrane automatycznie
 *    (stos wywołań, wersja, urządzenie) i wysłane za zgodą użytkownika,
 *  - `app-feedback.json` – zgłoszenia pisane ręcznie: błąd albo sugestia
 *    funkcjonalności.
 *
 * Adres e-mail jest zawsze opcjonalny. Aplikacje nie mają ciasteczek ani
 * sesji, więc endpoint jest otwarty dla każdego źródła (CORS `*`) – Tauri
 * i Electron wysyłają z własnych originów.
 */

const KINDS = {
  crash: 'reports', // automatyczny raport o awarii
  bug: 'feedback', // błąd opisany przez użytkownika
  feature: 'feedback', // sugestia funkcjonalności
}
const PLATFORMS = new Set(['android', 'ios', 'windows', 'macos', 'linux', 'wearos', 'web', 'other'])
const STATUSES = new Set(['new', 'in-progress', 'closed'])
const KIND_LABEL = { crash: 'Awaria', bug: 'Błąd', feature: 'Sugestia' }

const jsonFeedback = express.json({ limit: '256kb', type: () => true })

function cors(_req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Access-Control-Max-Age', '86400')
  next()
}

/** Pierwsze ramki stosu bez numerów linii – ta sama awaria w kolejnych wersjach daje ten sam odcisk. */
function fingerprint(app, stack) {
  const head = String(stack || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join('\n')
    .replace(/:\d+(:\d+)?\)?/g, '')
    .replace(/0x[0-9a-f]+/gi, '')
  return crypto.createHash('sha1').update(`${app}\n${head}`).digest('hex').slice(0, 16)
}

function cleanObject(value, maxKeys = 40) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, maxKeys)
      .map(([key, entry]) => [cleanText(key, 60), cleanText(typeof entry === 'string' ? entry : JSON.stringify(entry), 400)])
      .filter(([key]) => key),
  )
}

export function registerFeedback(app, deps) {
  const { dataDir, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits, readProjects, notifyOwner } = deps
  const FILES = {
    reports: path.join(dataDir, 'bug-reports.json'),
    feedback: path.join(dataDir, 'app-feedback.json'),
  }

  app.options(['/api/feedback', '/api/app-feedback'], cors, (_req, res) => res.sendStatus(204))

  app.post(['/api/feedback', '/api/app-feedback'], cors, jsonFeedback, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const key = `feedback:${req.ip || 'unknown'}`
    const now = Date.now()
    const recent = (rateLimits.get(key) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000)
    if (recent.length >= 20) return res.status(429).json({ error: 'Too many reports, try again later.' })
    recent.push(now)
    rateLimits.set(key, recent)

    if (cleanText(body.website, 100)) return res.status(200).json({ ok: true })

    const kind = Object.hasOwn(KINDS, body.kind) ? body.kind : ''
    if (!kind) return res.status(400).json({ error: 'Unknown report kind.' })

    const slug = cleanText(body.app, 80).toLowerCase()
    const projects = await readProjects().catch(() => [])
    const project = projects.find(item => item.slug === slug)
    const email = cleanText(body.email, 200).toLowerCase()
    const platform = cleanText(body.platform, 20).toLowerCase()

    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      kind,
      app: slug || 'unknown',
      appName: project?.name || cleanText(body.appName, 120) || slug || 'Nieznana aplikacja',
      appVersion: cleanText(body.appVersion, 60),
      platform: PLATFORMS.has(platform) ? platform : 'other',
      os: cleanText(body.os, 160),
      device: cleanText(body.device, 160),
      locale: cleanText(body.locale, 20),
      title: cleanText(body.title, 200),
      message: cleanText(body.message, 8000),
      email: isEmail(email) ? email : '',
      stack: cleanText(body.stack, 60000),
      log: cleanText(body.log, 30000),
      extra: cleanObject(body.extra),
      status: 'new',
    }

    if (kind !== 'crash' && entry.message.length < 3) return res.status(400).json({ error: 'Message is too short.' })
    if (kind === 'crash' && !entry.stack && !entry.message) return res.status(400).json({ error: 'Empty crash report.' })

    const bucket = KINDS[kind]
    let duplicateOf = null

    if (bucket === 'reports') {
      entry.fingerprint = fingerprint(entry.app, entry.stack || entry.message)
      entry.count = 1
      entry.lastAt = entry.createdAt
      entry.versions = entry.appVersion ? [entry.appVersion] : []
      await updateJson(FILES.reports, [], current => {
        const existing = current.find(item => item.fingerprint === entry.fingerprint && item.status !== 'closed')
        if (!existing) return [entry, ...current].slice(0, 3000)
        duplicateOf = existing.id
        // Ta sama awaria: liczymy wystąpienia, a najświeższy opis i komentarz
        // użytkownika dopisujemy, bo bywają pomocne.
        const comments = [...(existing.comments || [])]
        if (entry.message || entry.email) comments.unshift({ at: entry.createdAt, message: entry.message, email: entry.email, appVersion: entry.appVersion, device: entry.device })
        const merged = {
          ...existing,
          count: (existing.count || 1) + 1,
          lastAt: entry.createdAt,
          versions: [...new Set([...(existing.versions || []), ...entry.versions])].slice(-20),
          comments: comments.slice(0, 50),
          status: existing.status === 'closed' ? 'new' : existing.status,
        }
        return [merged, ...current.filter(item => item.id !== existing.id)]
      })
    } else {
      await updateJson(FILES.feedback, [], current => [entry, ...current].slice(0, 3000))
    }

    if (!duplicateOf && notifyOwner) {
      const label = KIND_LABEL[kind]
      notifyOwner({
        id: entry.id,
        replyTo: entry.email || undefined,
        subject: `${label}: ${entry.appName}${entry.appVersion ? ` ${entry.appVersion}` : ''}${entry.title ? ` – ${entry.title}` : ''}`,
        kicker: bucket === 'reports' ? 'Raport o błędzie z aplikacji' : 'Zgłoszenie z aplikacji',
        heading: `${label} · ${entry.appName}`,
        lines: [
          entry.appVersion && `Wersja: ${entry.appVersion}`,
          `Platforma: ${entry.platform}${entry.os ? ` (${entry.os})` : ''}`,
          entry.device && `Urządzenie: ${entry.device}`,
          entry.email ? `E-mail: ${entry.email}` : 'Bez adresu e-mail',
        ].filter(Boolean),
        body: [entry.message, entry.stack && entry.stack.slice(0, 4000)].filter(Boolean).join('\n\n'),
      }).catch(error => console.error('Feedback mail failed:', error.message))
    }

    res.status(201).json({ ok: true, id: duplicateOf || entry.id })
  })

  /* ── panel ─────────────────────────────────────────────────────────── */

  for (const [bucket, route] of [['reports', 'bug-reports'], ['feedback', 'app-feedback']]) {
    app.get(`/api/admin/${route}`, requireAdmin, async (_req, res) => {
      res.json(await readJson(FILES[bucket], []))
    })
    app.patch(`/api/admin/${route}/:id`, requireAdmin, enforceSameOrigin, async (req, res) => {
      const status = cleanText(req.body?.status, 30)
      const note = req.body?.note
      if (status && !STATUSES.has(status)) return res.status(400).json({ error: 'Niepoprawny status.' })
      const updated = await updateJson(FILES[bucket], [], current => current.map(item => {
        if (item.id !== req.params.id) return item
        const next = { ...item }
        if (status) next.status = status
        if (typeof note === 'string') next.note = cleanText(note, 4000)
        return next
      }))
      res.json(updated.find(item => item.id === req.params.id) || null)
    })
    app.delete(`/api/admin/${route}/:id`, requireAdmin, enforceSameOrigin, async (req, res) => {
      await updateJson(FILES[bucket], [], current => current.filter(item => item.id !== req.params.id))
      res.json({ ok: true })
    })
  }

  /** Dla dzwonka w panelu: nowe pozycje z obu zbiorów. */
  return {
    async fresh() {
      const [reports, feedback] = await Promise.all([readJson(FILES.reports, []), readJson(FILES.feedback, [])])
      const pick = list => (Array.isArray(list) ? list : []).filter(item => item.status === 'new')
      return { reports: pick(reports), feedback: pick(feedback) }
    },
  }
}

export { KIND_LABEL }
