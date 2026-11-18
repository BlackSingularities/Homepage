import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import { cleanText } from './sanitize.mjs'

/**
 * Punkty na mapie z komentarzami użytkowników aplikacji (GRAŃ na Windows i Androida).
 *
 * Aplikacja wysyła nowy punkt (położenie, rodzaj, tytuł, pierwszy komentarz, opcjonalny podpis)
 * albo komentarz pod istniejącym punktem. Wpisy czekają na zatwierdzenie w panelu (zakładka
 * „Punkty na mapie”), chyba że w panelu włączono publikowanie bez moderacji. Publiczne API
 * zwraca tylko zatwierdzone punkty i komentarze w zadanym prostokącie.
 *
 * Aplikacje nie mają sesji ani ciasteczek – endpointy publiczne mają CORS `*`, limit wpisów na
 * adres IP i pułapkę na boty (`website`). Adres IP nie jest zapisywany, tylko jego skrót z solą
 * (do limitów i blokowania nadużyć). Identyfikator instalacji (`client`) też trafia na dysk
 * wyłącznie jako skrót.
 */

/** Rodzaje przyjmowane od aplikacji (dawne „shelter” i „parking” zostają tylko w opisach starych wpisów). */
const CATEGORIES = new Set(['info', 'warning', 'water', 'view', 'photo', 'other'])
const PLATFORMS = new Set(['android', 'windows', 'linux', 'macos', 'ios', 'web', 'other'])
const STATUSES = new Set(['pending', 'approved', 'hidden'])
const CATEGORY_LABEL = {
  info: 'Informacja', warning: 'Utrudnienie', water: 'Woda', view: 'Punkt widokowy', shelter: 'Nocleg i schronienie',
  parking: 'Parking', photo: 'Miejsce na zdjęcie', other: 'Inne',
}
const APPS = new Set(['gran-3d'])
/** Po tylu zgłoszeniach zatwierdzony punkt wraca do moderacji (znika z mapy do decyzji). */
const REPORTS_TO_HIDE = 3
const MAX_POINTS = 20000
const LIMIT_WINDOW = 15 * 60 * 1000
const LIMIT_WRITES = 12

const jsonBody = express.json({ limit: '32kb', type: () => true })

function cors(_req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Access-Control-Max-Age', '86400')
  next()
}

const salt = crypto.randomBytes(16).toString('hex')
const hash = value => (value ? crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 20) : '')
/** Skrót identyfikatora instalacji – stały między restartami (bez soli procesu). */
const clientHash = value => (value ? crypto.createHash('sha256').update(`gran-client:${cleanText(value, 80)}`).digest('hex').slice(0, 20) : '')

function number(value, min, max) {
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/** Publiczna postać punktu: bez skrótów, zgłoszeń i notatek moderatora. */
function tally(point) {
  const values = Object.values(point.votes || {})
  return { up: values.filter(value => value > 0).length, down: values.filter(value => value < 0).length }
}

function publicPoint(point) {
  return {
    ...tally(point),
    id: point.id,
    lon: point.lon,
    lat: point.lat,
    ele: point.ele ?? null,
    category: CATEGORIES.has(point.category) ? point.category : 'other',
    title: point.title,
    author: point.author,
    createdAt: point.createdAt,
    comments: (point.comments || [])
      .filter(comment => comment.status === 'approved')
      .map(comment => ({ id: comment.id, author: comment.author, text: comment.text, createdAt: comment.createdAt, official: Boolean(comment.official) })),
  }
}

export function registerMapPoints(app, deps) {
  const { dataDir, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits, notifyOwner } = deps
  const FILE = path.join(dataDir, 'map-points.json')
  const SETTINGS = path.join(dataDir, 'map-points-settings.json')

  const settings = async () => ({ autoApprove: false, ...(await readJson(SETTINGS, {})) })

  function limited(req, kind) {
    const key = `map-points:${kind}:${hash(req.ip || 'unknown')}`
    const now = Date.now()
    const recent = (rateLimits.get(key) || []).filter(timestamp => now - timestamp < LIMIT_WINDOW)
    if (recent.length >= (kind === 'vote' ? LIMIT_WRITES * 5 : LIMIT_WRITES)) return true
    recent.push(now)
    rateLimits.set(key, recent)
    return false
  }

  function meta(req, body) {
    const platform = cleanText(body.platform, 20).toLowerCase()
    return {
      platform: PLATFORMS.has(platform) ? platform : 'other',
      appVersion: cleanText(body.appVersion, 40),
      locale: cleanText(body.locale, 20),
      client: clientHash(body.client),
      ip: hash(req.ip),
    }
  }

  app.options(['/api/map-points', '/api/map-points/:id/comments', '/api/map-points/:id/report', '/api/map-points/:id/vote'], cors, (_req, res) => res.sendStatus(204))

  /* ── publiczne ─────────────────────────────────────────────────────── */

  app.get('/api/map-points', cors, async (req, res) => {
    const [w, s, e, n] = String(req.query.bbox || '').split(',').map(Number)
    const valid = [w, s, e, n].every(Number.isFinite) && e > w && n > s && e - w <= 20 && n - s <= 20
    if (!valid) return res.status(400).json({ error: 'Podaj bbox=zachód,południe,wschód,północ (najwyżej 20°).' })
    const appSlug = cleanText(req.query.app, 40) || 'gran-3d'
    const all = await readJson(FILE, [])
    const points = all
      .filter(point => point.status === 'approved' && point.app === appSlug)
      .filter(point => point.lon >= w && point.lon <= e && point.lat >= s && point.lat <= n)
      .slice(0, 2000)
      .map(publicPoint)
    res.set('Cache-Control', 'public, max-age=60')
    res.json({ points })
  })

  app.post('/api/map-points', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (cleanText(body.website, 100)) return res.status(201).json({ id: crypto.randomUUID(), status: 'pending' })
    if (limited(req, 'write')) return res.status(429).json({ error: 'Za dużo wpisów – spróbuj za kilkanaście minut.' })
    const appSlug = cleanText(body.app, 40).toLowerCase()
    if (!APPS.has(appSlug)) return res.status(400).json({ error: 'Nieznana aplikacja.' })
    const lon = number(body.lon, -180, 180)
    const lat = number(body.lat, -85, 85)
    if (lon === null || lat === null) return res.status(400).json({ error: 'Niepoprawne położenie punktu.' })
    const category = CATEGORIES.has(body.category) ? body.category : 'other'
    const title = cleanText(body.title, 120)
    const text = cleanText(body.text, 2000)
    if (title.length < 3) return res.status(400).json({ error: 'Tytuł jest za krótki.' })
    if (text.length < 3) return res.status(400).json({ error: 'Komentarz jest za krótki.' })
    const { autoApprove } = await settings()
    const status = autoApprove ? 'approved' : 'pending'
    const now = new Date().toISOString()
    const info = meta(req, body)
    const author = cleanText(body.author, 60)
    const comment = { id: crypto.randomUUID(), createdAt: now, author, text, status, official: false, ...info }
    const point = {
      id: crypto.randomUUID(),
      app: appSlug,
      createdAt: now,
      updatedAt: now,
      lon: Math.round(lon * 1e6) / 1e6,
      lat: Math.round(lat * 1e6) / 1e6,
      ele: number(body.ele, -500, 9000),
      category,
      title,
      author,
      status,
      reports: [],
      comments: [comment],
      note: '',
      ...info,
    }
    await updateJson(FILE, [], current => [point, ...current].slice(0, MAX_POINTS))
    notifyOwner?.({
      id: point.id,
      subject: `Nowy punkt na mapie: ${title}`,
      kicker: 'Punkty na mapie · GRAŃ',
      heading: `${CATEGORY_LABEL[category]} · ${title}`,
      lines: [
        `Położenie: ${point.lat}, ${point.lon}${point.ele != null ? ` · ${Math.round(point.ele)} m` : ''}`,
        `Podpis: ${author || 'anonim'}`,
        `Platforma: ${info.platform}${info.appVersion ? ` ${info.appVersion}` : ''}`,
        status === 'pending' ? 'Czeka na zatwierdzenie w panelu.' : 'Opublikowany od razu (bez moderacji).',
      ],
      body: text,
    }).catch(error => console.error('Map point mail failed:', error.message))
    res.status(201).json({ id: point.id, status, commentId: comment.id })
  })

  app.post('/api/map-points/:id/comments', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (cleanText(body.website, 100)) return res.status(201).json({ id: crypto.randomUUID(), status: 'pending' })
    if (limited(req, 'write')) return res.status(429).json({ error: 'Za dużo wpisów – spróbuj za kilkanaście minut.' })
    const text = cleanText(body.text, 2000)
    if (text.length < 3) return res.status(400).json({ error: 'Komentarz jest za krótki.' })
    const { autoApprove } = await settings()
    const status = autoApprove ? 'approved' : 'pending'
    const info = meta(req, body)
    const comment = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), author: cleanText(body.author, 60), text, status, official: false, ...info }
    let found = null
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      // komentarz pod ukrytym punktem tylko od jego autora
      if (point.status === 'hidden' && point.client !== info.client) return point
      found = point
      return { ...point, updatedAt: comment.createdAt, comments: [...(point.comments || []), comment].slice(-300) }
    }))
    if (!found) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    notifyOwner?.({
      id: comment.id,
      subject: `Komentarz do punktu: ${found.title}`,
      kicker: 'Punkty na mapie · GRAŃ',
      heading: found.title,
      lines: [`Podpis: ${comment.author || 'anonim'}`, status === 'pending' ? 'Czeka na zatwierdzenie w panelu.' : 'Opublikowany od razu.'],
      body: text,
    }).catch(error => console.error('Map comment mail failed:', error.message))
    res.status(201).json({ id: comment.id, status })
  })

  app.post('/api/map-points/:id/report', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (limited(req, 'report')) return res.status(429).json({ error: 'Za dużo zgłoszeń – spróbuj później.' })
    const client = clientHash(body.client) || hash(req.ip)
    let found = false
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      found = true
      const reports = point.reports || []
      if (reports.some(report => report.client === client)) return point
      const next = [...reports, { at: new Date().toISOString(), reason: cleanText(body.reason, 300), client }]
      // dużo zgłoszeń: punkt wraca do moderacji, dopóki moderator nie zdecyduje
      const status = point.status === 'approved' && next.length >= REPORTS_TO_HIDE && !point.trusted ? 'pending' : point.status
      return { ...point, reports: next, status }
    }))
    if (!found) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    res.json({ ok: true })
  })

  /** Ocena punktu przez użytkownika: +1, −1 albo 0 (cofnięcie). Jedna ocena na instalację. */
  app.post('/api/map-points/:id/vote', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (limited(req, 'vote')) return res.status(429).json({ error: 'Za dużo ocen – spróbuj później.' })
    const client = clientHash(body.client)
    if (!client) return res.status(400).json({ error: 'Brak identyfikatora instalacji.' })
    const value = Number(body.value) > 0 ? 1 : Number(body.value) < 0 ? -1 : 0
    let found = null
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id || point.status !== 'approved') return point
      const votes = { ...(point.votes || {}) }
      if (value === 0) delete votes[client]
      else votes[client] = value
      found = { ...point, votes }
      return found
    }))
    if (!found) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    res.json(tally(found))
  })

  /* ── panel ─────────────────────────────────────────────────────────── */

  app.get('/api/admin/map-points', requireAdmin, async (_req, res) => {
    res.json(await readJson(FILE, []))
  })

  app.get('/api/admin/map-points-settings', requireAdmin, async (_req, res) => {
    res.json(await settings())
  })

  app.put('/api/admin/map-points-settings', requireAdmin, enforceSameOrigin, async (req, res) => {
    const next = { autoApprove: Boolean(req.body?.autoApprove) }
    await updateJson(SETTINGS, {}, current => ({ ...current, ...next }))
    res.json(await settings())
  })

  app.patch('/api/admin/map-points/:id', requireAdmin, enforceSameOrigin, async (req, res) => {
    const body = req.body || {}
    if (body.status && !STATUSES.has(body.status)) return res.status(400).json({ error: 'Niepoprawny status.' })
    if (body.category && !CATEGORIES.has(body.category)) return res.status(400).json({ error: 'Niepoprawny rodzaj.' })
    const updated = await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      const next = { ...point, updatedAt: new Date().toISOString() }
      if (body.status) {
        next.status = body.status
        // zatwierdzenie punktu zatwierdza też jego pierwszy komentarz (opis)
        if (body.status === 'approved') {
          next.trusted = true
          next.reports = []
          next.comments = (next.comments || []).map((comment, index) => (index === 0 && comment.status === 'pending' ? { ...comment, status: 'approved' } : comment))
        }
      }
      if (typeof body.title === 'string' && cleanText(body.title, 120).length >= 3) next.title = cleanText(body.title, 120)
      if (body.category) next.category = body.category
      if (typeof body.note === 'string') next.note = cleanText(body.note, 2000)
      if (body.clearReports) next.reports = []
      return next
    }))
    res.json(updated.find(point => point.id === req.params.id) || null)
  })

  app.patch('/api/admin/map-points/:id/comments/:commentId', requireAdmin, enforceSameOrigin, async (req, res) => {
    const body = req.body || {}
    if (body.status && !STATUSES.has(body.status)) return res.status(400).json({ error: 'Niepoprawny status.' })
    const updated = await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      return {
        ...point,
        comments: (point.comments || []).map(comment => {
          if (comment.id !== req.params.commentId) return comment
          const next = { ...comment }
          if (body.status) next.status = body.status
          if (typeof body.text === 'string' && cleanText(body.text, 2000).length >= 1) next.text = cleanText(body.text, 2000)
          return next
        }),
      }
    }))
    res.json(updated.find(point => point.id === req.params.id) || null)
  })

  /** Odpowiedź autora aplikacji – widoczna od razu, oznaczona jako „GRAŃ”. */
  app.post('/api/admin/map-points/:id/reply', requireAdmin, enforceSameOrigin, async (req, res) => {
    const text = cleanText(req.body?.text, 2000)
    if (text.length < 2) return res.status(400).json({ error: 'Odpowiedź jest pusta.' })
    const comment = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), author: 'GRAŃ', text, status: 'approved', official: true }
    const updated = await updateJson(FILE, [], current => current.map(point => (
      point.id === req.params.id ? { ...point, updatedAt: comment.createdAt, comments: [...(point.comments || []), comment] } : point
    )))
    res.json(updated.find(point => point.id === req.params.id) || null)
  })

  app.delete('/api/admin/map-points/:id/comments/:commentId', requireAdmin, enforceSameOrigin, async (req, res) => {
    const updated = await updateJson(FILE, [], current => current.map(point => (
      point.id === req.params.id ? { ...point, comments: (point.comments || []).filter(comment => comment.id !== req.params.commentId) } : point
    )))
    res.json(updated.find(point => point.id === req.params.id) || null)
  })

  app.delete('/api/admin/map-points/:id', requireAdmin, enforceSameOrigin, async (req, res) => {
    await updateJson(FILE, [], current => current.filter(point => point.id !== req.params.id))
    res.json({ ok: true })
  })

  /** Dla dzwonka w panelu: punkty i komentarze czekające na decyzję. */
  return {
    async fresh() {
      const all = await readJson(FILE, [])
      const items = []
      for (const point of Array.isArray(all) ? all : []) {
        if (point.status === 'pending') {
          items.push({ id: point.id, title: `Punkt: ${point.title}`, detail: `${CATEGORY_LABEL[point.category] || point.category}${point.reports?.length ? ` · zgłoszenia: ${point.reports.length}` : ''}`, createdAt: point.updatedAt || point.createdAt })
          continue
        }
        for (const comment of point.comments || []) {
          if (comment.status === 'pending') items.push({ id: comment.id, title: `Komentarz: ${point.title}`, detail: comment.text.slice(0, 80), createdAt: comment.createdAt })
        }
      }
      return items
    },
  }
}

export { CATEGORY_LABEL }
