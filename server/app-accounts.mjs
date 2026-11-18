import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { cleanText, isEmail } from './sanitize.mjs'
import * as tpl from './email.mjs'

/**
 * Konta użytkowników aplikacji (na razie GRAŃ na Windows, Androida i iOS).
 *
 * Aplikacja rejestruje użytkownika adresem e-mail, hasłem i nazwą widoczną przy wpisach. Strona
 * wysyła wiadomość aktywacyjną – z konta SMTP ustawionego dla aplikacji w panelu („Zarządzanie
 * aplikacjami” → aplikacja → Ustawienia), a gdy go nie ma, z tej samej skrzynki co redzikowski.com.
 * Po kliknięciu linku (strona /aplikacje/<aplikacja>/aktywacja) konto jest aktywne i aplikacja
 * może się zalogować. Logowanie daje token sesji (nagłówek `Authorization: Bearer …`); na dysku
 * zostają tylko skróty tokenów i haseł (scrypt).
 *
 * Endpointy publiczne mają CORS `*` (aplikacje natywne, bez ciasteczek) i limity na adres IP.
 */

/** Aplikacje z kontami: identyfikator (jak w API punktów) → nazwa i adres pod /aplikacje/<slug>. */
export const APPS = {
  'gran-3d': { name: 'GRAŃ', slug: 'gran' },
}

/** Identyfikator aplikacji z identyfikatora albo krótkiego adresu („gran”). */
export function appIdOf(value) {
  const key = cleanText(value, 40).toLowerCase()
  if (APPS[key]) return key
  return Object.entries(APPS).find(([, def]) => def.slug === key)?.[0] || null
}

const SITE = 'https://redzikowski.com'
/** Wersja polityki prywatności akceptowanej przy rejestracji. */
export const PRIVACY_VERSION = '2026-11-19'
const ACTIVATION_TTL = 72 * 60 * 60 * 1000
const RESET_TTL = 2 * 60 * 60 * 1000
const SESSIONS_MAX = 10
const LIMIT_WINDOW = 15 * 60 * 1000
const SEEN_EVERY = 60 * 60 * 1000
const STATUSES = new Set(['pending', 'active', 'blocked'])

const DEFAULTS = {
  autoApprove: false,
  photosPerUser: 3,
  photoScope: 'point',
  mergeRadius: 150,
  supportEmail: '',
  mail: { fromName: '', fromAddress: '', smtpHost: '', smtpPort: 465, smtpSecure: true, smtpUsername: '', password: null },
}

const jsonBody = express.json({ limit: '16kb', type: () => true })

export function cors(_req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.set('Access-Control-Max-Age', '86400')
  next()
}

const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex')
const token = () => crypto.randomBytes(32).toString('base64url')
const ipHash = value => crypto.createHash('sha256').update(`app-ip:${value || ''}`).digest('hex').slice(0, 20)

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  return { salt: salt.toString('base64'), hash: (await scrypt(password, salt)).toString('base64') }
}

async function verifyPassword(password, user) {
  if (!user?.salt || !user?.hash) return false
  const expected = Buffer.from(user.hash, 'base64')
  const actual = await scrypt(password, Buffer.from(user.salt, 'base64'))
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

const cleanEmail = value => cleanText(value, 200).toLowerCase()
const cleanName = value => cleanText(value, 40).replace(/\s+/g, ' ')

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Hasło musi mieć co najmniej 8 znaków.'
  if (password.length > 200) return 'Hasło jest za długie.'
  return ''
}

/** Postać konta dla aplikacji i panelu (bez skrótów haseł i tokenów). */
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    createdAt: user.createdAt,
    activatedAt: user.activatedAt || null,
  }
}

function adminUser(user) {
  return {
    ...publicUser(user),
    lastLoginAt: user.lastLoginAt || null,
    lastSeenAt: user.lastSeenAt || null,
    platform: user.platform || '',
    appVersion: user.appVersion || '',
    locale: user.locale || '',
    sessions: (user.sessions || []).length,
    consentAt: user.consentAt || null,
    consentVersion: user.consentVersion || '',
    activationSentAt: user.activation?.sentAt || null,
  }
}

const bearer = req => {
  const header = req.get('authorization') || ''
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

export function registerAppAccounts(app, deps) {
  const { dataDir, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits, encrypt, decrypt, getSettings, getTransport, sendLoggedMail } = deps
  const USERS = path.join(dataDir, 'app-users.json')
  const SETTINGS = path.join(dataDir, 'app-settings.json')
  /** Dawne ustawienia zakładki „Punkty na mapie” (tylko moderacja). */
  const LEGACY = path.join(dataDir, 'map-points-settings.json')
  /** Dane z innych modułów (punkty na mapie): liczby wpisów i usuwanie wpisów konta. */
  const hooks = []

  async function appSettings(appId, { includePassword = false } = {}) {
    const all = await readJson(SETTINGS, {})
    let stored = all[appId]
    if (!stored && appId === 'gran-3d') stored = await readJson(LEGACY, {})
    const merged = { ...DEFAULTS, ...(stored || {}), mail: { ...DEFAULTS.mail, ...(stored?.mail || {}) } }
    const { password, ...mail } = merged.mail
    return {
      ...merged,
      mail: { ...mail, hasPassword: Boolean(password), ...(includePassword ? { password: decrypt(password) } : {}) },
    }
  }

  async function saveSettings(appId, body) {
    const all = await readJson(SETTINGS, {})
    const previous = all[appId]?.mail || {}
    const mailIn = body.mail || {}
    const password = cleanText(mailIn.password, 500)
    const photosPerUser = Math.round(Number(body.photosPerUser))
    const mergeRadius = Math.round(Number(body.mergeRadius))
    const next = {
      autoApprove: Boolean(body.autoApprove),
      photosPerUser: Number.isFinite(photosPerUser) ? Math.min(Math.max(photosPerUser, 0), 20) : DEFAULTS.photosPerUser,
      photoScope: body.photoScope === 'app' ? 'app' : 'point',
      mergeRadius: Number.isFinite(mergeRadius) ? Math.min(Math.max(mergeRadius, 20), 2000) : DEFAULTS.mergeRadius,
      supportEmail: cleanEmail(body.supportEmail),
      mail: {
        fromName: cleanText(mailIn.fromName, 150),
        fromAddress: cleanEmail(mailIn.fromAddress),
        smtpHost: cleanText(mailIn.smtpHost, 250),
        smtpPort: Number(mailIn.smtpPort) || 465,
        smtpSecure: mailIn.smtpSecure !== false,
        smtpUsername: cleanText(mailIn.smtpUsername, 250),
        password: mailIn.clearPassword ? null : password ? encrypt(password) : previous.password || null,
      },
      updatedAt: new Date().toISOString(),
    }
    if (next.supportEmail && !isEmail(next.supportEmail)) throw Object.assign(new Error('Niepoprawny adres obsługi aplikacji.'), { status: 400 })
    if (next.mail.fromAddress && !isEmail(next.mail.fromAddress)) throw Object.assign(new Error('Niepoprawny adres nadawcy.'), { status: 400 })
    await updateJson(SETTINGS, {}, current => ({ ...current, [appId]: next }))
    return appSettings(appId)
  }

  /**
   * Poczta aplikacji: własne konto SMTP z ustawień aplikacji, a gdy go nie ma – skrzynka
   * redzikowski.com. `null` – żadna poczta nie jest skonfigurowana.
   */
  async function mailer(appId) {
    const settings = await appSettings(appId, { includePassword: true })
    const name = APPS[appId]?.name || appId
    const own = settings.mail
    if (own.smtpHost && own.smtpUsername && own.password) {
      return {
        own: true,
        transport: nodemailer.createTransport({
          host: own.smtpHost,
          port: own.smtpPort,
          secure: own.smtpSecure,
          auth: { user: own.smtpUsername, pass: own.password },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        }),
        from: { name: own.fromName || name, address: own.fromAddress || own.smtpUsername },
        support: settings.supportEmail || own.fromAddress || own.smtpUsername,
      }
    }
    const site = await getSettings({ includePassword: true })
    const transport = getTransport(site)
    if (!transport) return null
    return {
      own: false,
      transport,
      from: { name: own.fromName || `${name} · redzikowski.com`, address: site.smtpUsername },
      support: settings.supportEmail || site.ownerEmail || site.smtpUsername,
    }
  }

  async function send(appId, message, kind, id) {
    const box = await mailer(appId)
    if (!box) throw Object.assign(new Error('Poczta aplikacji nie jest skonfigurowana – spróbuj później.'), { status: 503 })
    const log = await sendLoggedMail(box.transport, { from: box.from, replyTo: box.support || undefined, ...message }, kind, id)
    if (log.status !== 'sent') throw Object.assign(new Error('Nie udało się wysłać wiadomości – spróbuj za chwilę.'), { status: 502 })
    return log
  }

  function frame(appId, box, parts, preheader) {
    return tpl.emailFrame(parts.join(''), { preheader, contact: box?.support || '' })
  }

  async function sendActivation(appId, user, rawToken) {
    const def = APPS[appId]
    const url = `${SITE}/aplikacje/${def.slug}/aktywacja?token=${encodeURIComponent(rawToken)}`
    const box = await mailer(appId)
    const subject = `${def.name}: potwierdź adres e-mail`
    return send(appId, {
      to: user.email,
      subject,
      text: `Cześć ${user.name}!\n\nAby aktywować konto w aplikacji ${def.name}, otwórz link:\n${url}\n\nLink działa przez 72 godziny. Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość – bez kliknięcia konto nie zostanie aktywowane i zniknie samo.${tpl.textFooter()}`,
      html: frame(appId, box, [
        tpl.kicker(`${def.name} · konto`),
        tpl.heading('Potwierdź adres e-mail', 26),
        tpl.paragraph(`Cześć ${user.name}! Dziękujemy za założenie konta w aplikacji ${def.name}. Kliknij przycisk, żeby je aktywować – potem zaloguj się w aplikacji tym adresem i hasłem.`),
        tpl.button(url, 'Aktywuj konto'),
        tpl.paragraph('Link działa przez 72 godziny. Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość – bez kliknięcia konto nie zostanie aktywowane i zniknie samo.'),
        tpl.details([['Polityka prywatności', tpl.link(`${SITE}/aplikacje/${def.slug}/prywatnosc`, `redzikowski.com/aplikacje/${def.slug}/prywatnosc`)]]),
      ], subject),
    }, 'app-activation', user.id)
  }

  async function sendReset(appId, user, rawToken) {
    const def = APPS[appId]
    const url = `${SITE}/aplikacje/${def.slug}/haslo?token=${encodeURIComponent(rawToken)}`
    const box = await mailer(appId)
    const subject = `${def.name}: nowe hasło`
    return send(appId, {
      to: user.email,
      subject,
      text: `Cześć ${user.name}!\n\nNowe hasło do konta ${def.name} ustawisz pod adresem:\n${url}\n\nLink działa przez 2 godziny. Jeśli to nie Ty prosiłeś o zmianę, zignoruj tę wiadomość – hasło zostanie bez zmian.${tpl.textFooter()}`,
      html: frame(appId, box, [
        tpl.kicker(`${def.name} · konto`),
        tpl.heading('Ustaw nowe hasło', 26),
        tpl.paragraph(`Cześć ${user.name}! Ktoś (pewnie Ty) poprosił o nowe hasło do konta w aplikacji ${def.name}.`),
        tpl.button(url, 'Ustaw nowe hasło'),
        tpl.paragraph('Link działa przez 2 godziny. Jeśli to nie Ty prosiłeś o zmianę, zignoruj tę wiadomość – hasło zostanie bez zmian.'),
      ], subject),
    }, 'app-reset', user.id)
  }

  function limited(req, kind, max) {
    const key = `app-accounts:${kind}:${ipHash(req.ip)}`
    const now = Date.now()
    const recent = (rateLimits.get(key) || []).filter(at => now - at < LIMIT_WINDOW)
    if (recent.length >= max) return true
    recent.push(now)
    rateLimits.set(key, recent)
    return false
  }

  /** Niepotwierdzone konta po terminie linku znikają (adres można zarejestrować ponownie). */
  const expired = user => user.status === 'pending' && user.activation?.expires && Date.parse(user.activation.expires) < Date.now() - ACTIVATION_TTL

  async function users(appId) {
    const all = await readJson(USERS, [])
    return (Array.isArray(all) ? all : []).filter(user => user.app === appId && !expired(user))
  }

  /**
   * Konto z nagłówka `Authorization: Bearer …` (aktywne). Ostatnia aktywność zapisuje się
   * najwyżej raz na godzinę.
   */
  async function authenticate(req, appId) {
    const raw = bearer(req)
    if (!raw || !appId) return null
    const hashed = sha(raw)
    const list = await readJson(USERS, [])
    const user = (Array.isArray(list) ? list : []).find(entry => entry.app === appId && (entry.sessions || []).some(session => session.hash === hashed))
    if (!user || user.status !== 'active') return null
    const now = Date.now()
    if (!user.lastSeenAt || now - Date.parse(user.lastSeenAt) > SEEN_EVERY) {
      const at = new Date(now).toISOString()
      updateJson(USERS, [], current => current.map(entry => (entry.id === user.id
        ? { ...entry, lastSeenAt: at, sessions: (entry.sessions || []).map(session => (session.hash === hashed ? { ...session, lastUsedAt: at } : session)) }
        : entry))).catch(() => undefined)
    }
    return user
  }

  function resolveApp(req, res) {
    const appId = appIdOf(req.params.app)
    if (!appId) res.status(404).json({ error: 'Nieznana aplikacja.' })
    return appId
  }

  const body = req => (req.body && typeof req.body === 'object' ? req.body : {})
  const fail = (res, error) => res.status(error.status || 500).json({ error: error.status ? error.message : 'Wystąpił błąd serwera.' })

  app.options('/api/apps/:app/*path', cors, (_req, res) => res.sendStatus(204))

  /* ── publiczne: konto ──────────────────────────────────────────────── */

  /** Dane publiczne aplikacji: adres obsługi, wersja polityki, limity zdjęć i scalania. */
  app.get('/api/apps/:app/info', cors, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    const settings = await appSettings(appId)
    const box = await mailer(appId).catch(() => null)
    res.set('Cache-Control', 'public, max-age=300')
    res.json({
      id: appId,
      name: APPS[appId].name,
      supportEmail: settings.supportEmail || box?.support || '',
      privacyVersion: PRIVACY_VERSION,
      privacyUrl: `${SITE}/aplikacje/${APPS[appId].slug}/prywatnosc`,
      limits: { photosPerUser: settings.photosPerUser, photoScope: settings.photoScope, mergeRadius: settings.mergeRadius },
    })
  })

  app.post('/api/apps/:app/register', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    const input = body(req)
    if (cleanText(input.website, 100)) return res.status(201).json({ ok: true, status: 'pending' })
    if (limited(req, 'register', 6)) return res.status(429).json({ error: 'Za dużo prób rejestracji – spróbuj za kilkanaście minut.' })
    const email = cleanEmail(input.email)
    const name = cleanName(input.name)
    if (!isEmail(email)) return res.status(400).json({ error: 'Podaj poprawny adres e-mail.' })
    if (name.length < 2) return res.status(400).json({ error: 'Nazwa widoczna przy wpisach musi mieć co najmniej 2 znaki.' })
    if (/^(gra[nń]|admin|moderator|redzikowski)/i.test(name)) return res.status(400).json({ error: 'Ta nazwa jest zarezerwowana – wybierz inną.' })
    const weak = checkPassword(input.password)
    if (weak) return res.status(400).json({ error: weak })
    if (input.consent !== true) return res.status(400).json({ error: 'Zaakceptuj politykę prywatności, żeby założyć konto.' })
    if (!(await mailer(appId))) return res.status(503).json({ error: 'Rejestracja jest chwilowo niedostępna (poczta). Spróbuj później.' })

    const existing = (await users(appId)).find(user => user.email === email)
    if (existing && existing.status !== 'pending') {
      return res.status(409).json({ error: 'Konto z tym adresem już istnieje – zaloguj się albo ustaw nowe hasło.', code: 'exists' })
    }
    const taken = (await users(appId)).some(user => user.id !== existing?.id && user.name.toLowerCase() === name.toLowerCase())
    if (taken) return res.status(409).json({ error: 'Ta nazwa jest już zajęta – wybierz inną.', code: 'name' })

    const raw = token()
    const now = new Date().toISOString()
    const secret = await hashPassword(input.password)
    const user = {
      ...(existing || { id: crypto.randomUUID(), app: appId, createdAt: now, sessions: [] }),
      email,
      name,
      ...secret,
      status: 'pending',
      platform: cleanText(input.platform, 20).toLowerCase(),
      appVersion: cleanText(input.appVersion, 40),
      locale: cleanText(input.locale, 20),
      consentAt: now,
      consentVersion: PRIVACY_VERSION,
      activation: { hash: sha(raw), expires: new Date(Date.now() + ACTIVATION_TTL).toISOString(), sentAt: now },
    }
    try {
      await sendActivation(appId, user, raw)
    } catch (error) {
      return fail(res, error)
    }
    await updateJson(USERS, [], current => [user, ...current.filter(entry => entry.id !== user.id && !(entry.app === appId && entry.email === email))])
    res.status(201).json({ ok: true, status: 'pending' })
  })

  app.post('/api/apps/:app/resend', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    if (limited(req, 'resend', 5)) return res.status(429).json({ error: 'Za dużo próśb – spróbuj za kilkanaście minut.' })
    const email = cleanEmail(body(req).email)
    const user = (await users(appId)).find(entry => entry.email === email && entry.status === 'pending')
    // ta sama odpowiedź dla każdego adresu – bez zdradzania, kto ma konto
    if (!user) return res.json({ ok: true })
    const raw = token()
    const now = new Date().toISOString()
    const next = { ...user, activation: { hash: sha(raw), expires: new Date(Date.now() + ACTIVATION_TTL).toISOString(), sentAt: now } }
    try {
      await sendActivation(appId, next, raw)
    } catch (error) {
      return fail(res, error)
    }
    await updateJson(USERS, [], current => current.map(entry => (entry.id === user.id ? next : entry)))
    res.json({ ok: true })
  })

  app.post('/api/apps/:app/activate', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    if (limited(req, 'activate', 30)) return res.status(429).json({ error: 'Za dużo prób – spróbuj później.' })
    const raw = cleanText(body(req).token, 200)
    if (!raw) return res.status(400).json({ error: 'Brak kodu aktywacyjnego w linku.' })
    const hashed = sha(raw)
    let found = null
    await updateJson(USERS, [], current => current.map(entry => {
      if (entry.app !== appId || entry.activation?.hash !== hashed) return entry
      if (Date.parse(entry.activation.expires) < Date.now()) {
        found = { expired: true, entry }
        return entry
      }
      found = { entry }
      const { activation, ...rest } = entry
      return { ...rest, status: entry.status === 'blocked' ? 'blocked' : 'active', activatedAt: entry.activatedAt || new Date().toISOString() }
    }))
    if (!found) return res.status(404).json({ error: 'Link jest nieaktualny albo konto jest już aktywne. Spróbuj się zalogować w aplikacji.' })
    if (found.expired) return res.status(410).json({ error: 'Link wygasł. W aplikacji wybierz „Wyślij link ponownie”.' })
    res.json({ ok: true, name: found.entry.name, app: APPS[appId].name })
  })

  app.post('/api/apps/:app/login', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    if (limited(req, 'login', 12)) return res.status(429).json({ error: 'Za dużo prób logowania – spróbuj za kilkanaście minut.' })
    const input = body(req)
    const email = cleanEmail(input.email)
    const user = (await users(appId)).find(entry => entry.email === email)
    const ok = user && typeof input.password === 'string' && (await verifyPassword(input.password, user))
    if (!ok) return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło.', code: 'credentials' })
    if (user.status === 'pending') return res.status(403).json({ error: 'Konto nie jest jeszcze aktywne – kliknij link z wiadomości aktywacyjnej.', code: 'inactive' })
    if (user.status === 'blocked') return res.status(403).json({ error: 'Konto zostało zablokowane. Napisz do obsługi aplikacji.', code: 'blocked' })
    const raw = token()
    const now = new Date().toISOString()
    const session = { hash: sha(raw), createdAt: now, lastUsedAt: now, platform: cleanText(input.platform, 20).toLowerCase() }
    await updateJson(USERS, [], current => current.map(entry => (entry.id === user.id ? {
      ...entry,
      lastLoginAt: now,
      lastSeenAt: now,
      platform: session.platform || entry.platform,
      appVersion: cleanText(input.appVersion, 40) || entry.appVersion,
      sessions: [session, ...(entry.sessions || [])].slice(0, SESSIONS_MAX),
    } : entry)))
    res.json({ token: raw, user: publicUser(user) })
  })

  app.post('/api/apps/:app/logout', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    const raw = bearer(req)
    if (raw) {
      const hashed = sha(raw)
      await updateJson(USERS, [], current => current.map(entry => (entry.app === appId && (entry.sessions || []).some(session => session.hash === hashed)
        ? { ...entry, sessions: entry.sessions.filter(session => session.hash !== hashed) }
        : entry)))
    }
    res.json({ ok: true })
  })

  app.get('/api/apps/:app/me', cors, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    const user = await authenticate(req, appId)
    if (!user) return res.status(401).json({ error: 'Sesja wygasła – zaloguj się ponownie.', code: 'auth' })
    const settings = await appSettings(appId)
    const counts = {}
    for (const hook of hooks) Object.assign(counts, (await hook.userStats?.(appId))?.get(user.id) || {})
    res.json({ user: publicUser(user), counts, limits: { photosPerUser: settings.photosPerUser, photoScope: settings.photoScope, mergeRadius: settings.mergeRadius } })
  })

  app.post('/api/apps/:app/forgot', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    if (limited(req, 'forgot', 5)) return res.status(429).json({ error: 'Za dużo próśb – spróbuj za kilkanaście minut.' })
    const email = cleanEmail(body(req).email)
    const user = (await users(appId)).find(entry => entry.email === email && entry.status !== 'blocked')
    if (!user) return res.json({ ok: true })
    const raw = token()
    const next = { ...user, reset: { hash: sha(raw), expires: new Date(Date.now() + RESET_TTL).toISOString() } }
    try {
      await sendReset(appId, next, raw)
    } catch (error) {
      return fail(res, error)
    }
    await updateJson(USERS, [], current => current.map(entry => (entry.id === user.id ? next : entry)))
    res.json({ ok: true })
  })

  app.post('/api/apps/:app/reset', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    if (limited(req, 'reset', 20)) return res.status(429).json({ error: 'Za dużo prób – spróbuj później.' })
    const input = body(req)
    const weak = checkPassword(input.password)
    if (weak) return res.status(400).json({ error: weak })
    const hashed = sha(cleanText(input.token, 200))
    const user = (await users(appId)).find(entry => entry.reset?.hash === hashed)
    if (!user || Date.parse(user.reset.expires) < Date.now()) return res.status(410).json({ error: 'Link wygasł albo został już użyty. Poproś o nowy w aplikacji.' })
    const secret = await hashPassword(input.password)
    await updateJson(USERS, [], current => current.map(entry => {
      if (entry.id !== user.id) return entry
      const { reset, activation, ...rest } = entry
      // link z poczty potwierdza też adres – niepotwierdzone konto staje się aktywne
      return { ...rest, ...secret, sessions: [], status: entry.status === 'pending' ? 'active' : entry.status, activatedAt: entry.activatedAt || new Date().toISOString() }
    }))
    res.json({ ok: true, name: user.name, app: APPS[appId].name })
  })

  /** Usunięcie konta przez użytkownika (z aplikacji, po podaniu hasła). */
  app.post('/api/apps/:app/me/delete', cors, jsonBody, async (req, res) => {
    const appId = resolveApp(req, res)
    if (!appId) return undefined
    const user = await authenticate(req, appId)
    if (!user) return res.status(401).json({ error: 'Sesja wygasła – zaloguj się ponownie.', code: 'auth' })
    if (!(await verifyPassword(String(body(req).password || ''), user))) return res.status(403).json({ error: 'Nieprawidłowe hasło.' })
    await removeUser(appId, user.id)
    res.json({ ok: true })
  })

  async function removeUser(appId, id) {
    for (const hook of hooks) await hook.forgetUser?.(appId, id)
    await updateJson(USERS, [], current => current.filter(entry => entry.id !== id))
  }

  /* ── panel ─────────────────────────────────────────────────────────── */

  async function summary(appId) {
    const list = await users(appId)
    const day = 24 * 60 * 60 * 1000
    const since = days => list.filter(user => Date.now() - Date.parse(user.createdAt) < days * day).length
    const seen = days => list.filter(user => user.lastSeenAt && Date.now() - Date.parse(user.lastSeenAt) < days * day).length
    const platforms = {}
    for (const user of list) if (user.platform) platforms[user.platform] = (platforms[user.platform] || 0) + 1
    const content = {}
    for (const hook of hooks) Object.assign(content, await hook.appStats?.(appId))
    const settings = await appSettings(appId)
    const site = await getSettings()
    const ownMail = Boolean(settings.mail.smtpHost && settings.mail.smtpUsername && settings.mail.hasPassword)
    return {
      id: appId,
      ...APPS[appId],
      users: {
        total: list.length,
        active: list.filter(user => user.status === 'active').length,
        pending: list.filter(user => user.status === 'pending').length,
        blocked: list.filter(user => user.status === 'blocked').length,
        new7: since(7),
        new30: since(30),
        seen7: seen(7),
        seen30: seen(30),
        platforms,
      },
      content,
      mail: { own: ownMail, ready: ownMail || Boolean(site.smtpHost && site.smtpUsername && site.hasPassword) },
    }
  }

  const adminApp = (req, res) => {
    const appId = appIdOf(req.params.app)
    if (!appId) res.status(404).json({ error: 'Nieznana aplikacja.' })
    return appId
  }

  app.get('/api/admin/apps', requireAdmin, async (_req, res) => {
    res.json(await Promise.all(Object.keys(APPS).map(summary)))
  })

  app.get('/api/admin/apps/:app', requireAdmin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    res.json(await summary(appId))
  })

  app.get('/api/admin/apps/:app/users', requireAdmin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    const stats = new Map()
    for (const hook of hooks) {
      for (const [id, value] of (await hook.userStats?.(appId)) || []) stats.set(id, { ...(stats.get(id) || {}), ...value })
    }
    res.json((await users(appId)).map(user => ({ ...adminUser(user), counts: stats.get(user.id) || {} })))
  })

  app.patch('/api/admin/apps/:app/users/:id', requireAdmin, enforceSameOrigin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    const status = cleanText(req.body?.status, 20)
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'Niepoprawny stan konta.' })
    const updated = await updateJson(USERS, [], current => current.map(entry => {
      if (entry.id !== req.params.id || entry.app !== appId) return entry
      const next = { ...entry, status }
      if (status === 'blocked') next.sessions = []
      if (status === 'active') {
        delete next.activation
        next.activatedAt = entry.activatedAt || new Date().toISOString()
      }
      return next
    }))
    const user = updated.find(entry => entry.id === req.params.id)
    res.json(user ? adminUser(user) : null)
  })

  app.post('/api/admin/apps/:app/users/:id/resend', requireAdmin, enforceSameOrigin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    const user = (await users(appId)).find(entry => entry.id === req.params.id && entry.status === 'pending')
    if (!user) return res.status(404).json({ error: 'To konto jest już aktywne albo nie istnieje.' })
    const raw = token()
    const now = new Date().toISOString()
    const next = { ...user, activation: { hash: sha(raw), expires: new Date(Date.now() + ACTIVATION_TTL).toISOString(), sentAt: now } }
    try {
      await sendActivation(appId, next, raw)
    } catch (error) {
      return fail(res, error)
    }
    await updateJson(USERS, [], current => current.map(entry => (entry.id === user.id ? next : entry)))
    res.json(adminUser(next))
  })

  app.delete('/api/admin/apps/:app/users/:id', requireAdmin, enforceSameOrigin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    await removeUser(appId, req.params.id)
    res.json({ ok: true })
  })

  app.get('/api/admin/apps/:app/settings', requireAdmin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    const [settings, site] = await Promise.all([appSettings(appId), getSettings()])
    res.json({ ...settings, siteMail: { address: site.smtpUsername, name: site.fromName, ready: Boolean(site.smtpHost && site.smtpUsername && site.hasPassword) } })
  })

  app.put('/api/admin/apps/:app/settings', requireAdmin, enforceSameOrigin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    try {
      res.json(await saveSettings(appId, req.body || {}))
    } catch (error) {
      fail(res, error)
    }
  })

  app.post('/api/admin/apps/:app/test-mail', requireAdmin, enforceSameOrigin, async (req, res) => {
    const appId = adminApp(req, res)
    if (!appId) return undefined
    const site = await getSettings()
    const to = cleanEmail(req.body?.to) || site.ownerEmail || site.smtpUsername
    if (!isEmail(to)) return res.status(400).json({ error: 'Podaj adres, na który wysłać próbną wiadomość.' })
    const box = await mailer(appId)
    if (!box) return res.status(503).json({ error: 'Ani aplikacja, ani strona nie ma skonfigurowanej poczty.' })
    const subject = `${APPS[appId].name}: próbna wiadomość`
    try {
      await send(appId, {
        to,
        subject,
        text: `Poczta aplikacji ${APPS[appId].name} działa (${box.own ? 'własne konto SMTP aplikacji' : 'skrzynka redzikowski.com'}).`,
        html: frame(appId, box, [
          tpl.kicker(`${APPS[appId].name} · poczta`),
          tpl.heading('Poczta aplikacji działa', 26),
          tpl.paragraph(box.own ? 'Ta wiadomość wyszła z konta SMTP ustawionego dla aplikacji.' : 'Aplikacja nie ma własnego konta SMTP – wiadomości wychodzą ze skrzynki redzikowski.com.'),
          tpl.details([['Nadawca', `${box.from.name} <${box.from.address}>`], ['Odpowiedzi do', box.support || '']]),
        ], subject),
      }, 'app-test', appId)
      res.json({ ok: true, to, own: box.own })
    } catch (error) {
      fail(res, error)
    }
  })

  return {
    authenticate,
    appSettings,
    /** Moduł z wpisami użytkowników: `userStats`, `appStats`, `forgetUser`. */
    attach(hook) {
      hooks.push(hook)
    },
  }
}
