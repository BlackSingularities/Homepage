import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { cleanText } from './sanitize.mjs'
import { cors } from './app-accounts.mjs'

/**
 * Punkty na mapie z komentarzami i zdjęciami użytkowników aplikacji (GRAŃ na Windows, Androida
 * i iOS).
 *
 * Wpisy dodają tylko zalogowani użytkownicy (konta z `app-accounts.mjs`, nagłówek
 * `Authorization: Bearer …`): nowy punkt (położenie, rodzaj, tytuł, pierwszy komentarz), komentarz
 * pod istniejącym punktem, zdjęcie (najwyżej kilka od jednej osoby – limit w ustawieniach
 * aplikacji) i ocenę. Wpisy czekają na zatwierdzenie w panelu („Zarządzanie aplikacjami” → GRAŃ),
 * chyba że włączono publikowanie bez moderacji. Publiczne API zwraca tylko zatwierdzone punkty,
 * komentarze i zdjęcia w zadanym prostokącie.
 *
 * Zdjęcia serwer zawsze przelicza sam: najwyżej 2048 px na dłuższym boku, JPEG o jakości 75,
 * bez metadanych (EXIF z położeniem i aparatem jest usuwany).
 *
 * Adres IP nie jest zapisywany, tylko jego skrót z solą (do limitów i blokowania nadużyć).
 */

/** Rodzaje przyjmowane od aplikacji (dawny „parking” zostaje tylko w opisach starych wpisów). */
const CATEGORIES = new Set(['info', 'warning', 'closed', 'avalanche', 'exposed', 'water', 'entrance', 'transport', 'signal', 'shelter', 'view', 'photo', 'ban', 'other'])
const PLATFORMS = new Set(['android', 'windows', 'linux', 'macos', 'ios', 'web', 'other'])
const STATUSES = new Set(['pending', 'approved', 'hidden'])
const CATEGORY_LABEL = {
  info: 'Informacja', warning: 'Utrudnienie', closed: 'Szlak zamknięty', avalanche: 'Zagrożenie lawinowe',
  exposed: 'Łańcuchy i ekspozycja', water: 'Woda', entrance: 'Wejście i opłaty', transport: 'Dojazd i parking',
  signal: 'Zasięg i ratunek', shelter: 'Schron', view: 'Punkt widokowy', photo: 'Miejsce na zdjęcie', ban: 'Zakaz',
  parking: 'Parking', other: 'Inne',
}
const APPS = new Set(['gran-3d'])
/** Po tylu zgłoszeniach zatwierdzony punkt wraca do moderacji (znika z mapy do decyzji). */
const REPORTS_TO_HIDE = 3
const MAX_POINTS = 20000
const LIMIT_WINDOW = 15 * 60 * 1000
const LIMIT_WRITES = 12
/** Zdjęcie: dłuższy bok i jakość JPEG po przeliczeniu na serwerze. */
const PHOTO_MAX = 2048
const PHOTO_QUALITY = 75
const THUMB_MAX = 480
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'])
const AUTH_ERROR = { error: 'Zaloguj się w aplikacji, żeby dodawać wpisy (konto zakładasz w GRANI, potwierdzasz mailem).', code: 'auth' }

const jsonBody = express.json({ limit: '32kb', type: () => true })
const rawPhoto = express.raw({ type: () => true, limit: '12mb' })

const salt = crypto.randomBytes(16).toString('hex')
const hash = value => (value ? crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 20) : '')
/** Skrót identyfikatora instalacji – stały między restartami (bez soli procesu). */
const clientHash = value => (value ? crypto.createHash('sha256').update(`gran-client:${cleanText(value, 80)}`).digest('hex').slice(0, 20) : '')

function number(value, min, max) {
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/** Odległość w metrach (wzór haversine). */
export function distance(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

function tally(point) {
  const values = Object.values(point.votes || {})
  return { up: values.filter(value => value > 0).length, down: values.filter(value => value < 0).length }
}

const photoUrl = photo => `/api/map-points/photos/${photo.file}`

function publicPhoto(photo) {
  return {
    id: photo.id,
    url: photoUrl(photo),
    thumb: `${photoUrl(photo)}?w=${THUMB_MAX}`,
    author: photo.author || '',
    createdAt: photo.createdAt,
    width: photo.width || 0,
    height: photo.height || 0,
  }
}

/** Publiczna postać punktu: bez skrótów, zgłoszeń i notatek moderatora. */
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
    photos: (point.photos || []).filter(photo => photo.status === 'approved').map(publicPhoto),
  }
}

/** Wpisy konta w punkcie (zdjęcia przy limicie, liczniki w panelu). */
const ownPhotos = (point, userId) => (point.photos || []).filter(photo => photo.userId === userId)

export function registerMapPoints(app, deps) {
  const { dataDir, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits, notifyOwner, accounts } = deps
  const FILE = path.join(dataDir, 'map-points.json')
  const PHOTO_DIR = path.join(dataDir, 'app-photos')
  const THUMB_DIR = path.join(PHOTO_DIR, 'thumbs')

  const settings = appSlug => accounts.appSettings(appSlug)

  function limited(req, kind) {
    const key = `map-points:${kind}:${hash(req.ip || 'unknown')}`
    const now = Date.now()
    const recent = (rateLimits.get(key) || []).filter(timestamp => now - timestamp < LIMIT_WINDOW)
    const max = kind === 'vote' ? LIMIT_WRITES * 5 : kind === 'photo' ? LIMIT_WRITES * 2 : LIMIT_WRITES
    if (recent.length >= max) return true
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

  async function removePhotoFiles(photos) {
    for (const photo of photos) {
      const file = path.basename(photo.file || '')
      if (!file) continue
      await fs.unlink(path.join(PHOTO_DIR, file)).catch(() => undefined)
      await fs.unlink(path.join(THUMB_DIR, file)).catch(() => undefined)
    }
  }

  app.options(['/api/map-points', '/api/map-points/:id/comments', '/api/map-points/:id/report', '/api/map-points/:id/vote', '/api/map-points/:id/photos'], cors, (_req, res) => res.sendStatus(204))

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

  /** Plik zdjęcia (zatwierdzonego); `?w=480` – miniatura. */
  app.get('/api/map-points/photos/:file', cors, async (req, res) => {
    const file = path.basename(cleanText(req.params.file, 80))
    if (!/^[\w-]+\.jpg$/.test(file)) return res.status(404).end()
    const all = await readJson(FILE, [])
    const visible = all.some(point => point.status === 'approved' && (point.photos || []).some(photo => photo.file === file && photo.status === 'approved'))
    if (!visible) return res.status(404).end()
    servePhoto(req, res, file)
  })

  async function servePhoto(req, res, file) {
    const source = path.join(PHOTO_DIR, file)
    try {
      let target = source
      if (Number(req.query.w) > 0) {
        target = path.join(THUMB_DIR, file)
        if (!(await fs.stat(target).catch(() => null))) {
          await fs.mkdir(THUMB_DIR, { recursive: true })
          const buffer = await sharp(source).resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70, mozjpeg: true }).toBuffer()
          await fs.writeFile(target, buffer)
        }
      }
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.type('image/jpeg')
      res.sendFile(target, { maxAge: '30d' })
    } catch {
      res.status(404).end()
    }
  }

  app.post('/api/map-points', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (cleanText(body.website, 100)) return res.status(201).json({ id: crypto.randomUUID(), status: 'pending' })
    const appSlug = cleanText(body.app, 40).toLowerCase()
    if (!APPS.has(appSlug)) return res.status(400).json({ error: 'Nieznana aplikacja.' })
    const user = await accounts.authenticate(req, appSlug)
    if (!user) return res.status(401).json(AUTH_ERROR)
    if (limited(req, 'write')) return res.status(429).json({ error: 'Za dużo wpisów – spróbuj za kilkanaście minut.' })
    const lon = number(body.lon, -180, 180)
    const lat = number(body.lat, -85, 85)
    if (lon === null || lat === null) return res.status(400).json({ error: 'Niepoprawne położenie punktu.' })
    const category = CATEGORIES.has(body.category) ? body.category : 'other'
    const title = cleanText(body.title, 120)
    const text = cleanText(body.text, 2000)
    if (title.length < 3) return res.status(400).json({ error: 'Tytuł jest za krótki.' })
    if (text.length < 3) return res.status(400).json({ error: 'Komentarz jest za krótki.' })
    const { autoApprove, mergeRadius } = await settings(appSlug)
    const status = autoApprove ? 'approved' : 'pending'
    const now = new Date().toISOString()
    const info = meta(req, body)
    const author = user.name
    const comment = { id: crypto.randomUUID(), createdAt: now, author, userId: user.id, text, status, official: false, ...info }
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
      userId: user.id,
      status,
      reports: [],
      comments: [comment],
      photos: [],
      note: '',
      ...info,
    }
    const all = await readJson(FILE, [])
    const near = all
      .filter(other => other.app === appSlug && other.status !== 'hidden')
      .map(other => ({ id: other.id, title: other.title, distance: Math.round(distance(point, other)) }))
      .filter(other => other.distance <= mergeRadius)
      .sort((a, b) => a.distance - b.distance)
    await updateJson(FILE, [], current => [point, ...current].slice(0, MAX_POINTS))
    notifyOwner?.({
      id: point.id,
      subject: `Nowy punkt na mapie: ${title}`,
      kicker: 'Punkty na mapie · GRAŃ',
      heading: `${CATEGORY_LABEL[category]} · ${title}`,
      lines: [
        `Położenie: ${point.lat}, ${point.lon}${point.ele != null ? ` · ${Math.round(point.ele)} m` : ''}`,
        `Konto: ${author} (${user.email})`,
        `Platforma: ${info.platform}${info.appVersion ? ` ${info.appVersion}` : ''}`,
        ...(near.length ? [`W pobliżu: ${near.slice(0, 3).map(other => `${other.title} (${other.distance} m)`).join(', ')} – można scalić w panelu.`] : []),
        status === 'pending' ? 'Czeka na zatwierdzenie w panelu.' : 'Opublikowany od razu (bez moderacji).',
      ],
      body: text,
    }).catch(error => console.error('Map point mail failed:', error.message))
    res.status(201).json({ id: point.id, status, commentId: comment.id, author, nearby: near.slice(0, 5) })
  })

  app.post('/api/map-points/:id/comments', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (cleanText(body.website, 100)) return res.status(201).json({ id: crypto.randomUUID(), status: 'pending' })
    const all = await readJson(FILE, [])
    const target = all.find(point => point.id === req.params.id)
    if (!target) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    const user = await accounts.authenticate(req, target.app)
    if (!user) return res.status(401).json(AUTH_ERROR)
    if (limited(req, 'write')) return res.status(429).json({ error: 'Za dużo wpisów – spróbuj za kilkanaście minut.' })
    const text = cleanText(body.text, 2000)
    if (text.length < 3) return res.status(400).json({ error: 'Komentarz jest za krótki.' })
    const { autoApprove } = await settings(target.app)
    const status = autoApprove ? 'approved' : 'pending'
    const info = meta(req, body)
    const comment = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), author: user.name, userId: user.id, text, status, official: false, ...info }
    let found = null
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      // komentarz pod ukrytym punktem tylko od jego autora
      if (point.status === 'hidden' && point.userId !== user.id) return point
      found = point
      return { ...point, updatedAt: comment.createdAt, comments: [...(point.comments || []), comment].slice(-300) }
    }))
    if (!found) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    notifyOwner?.({
      id: comment.id,
      subject: `Komentarz do punktu: ${found.title}`,
      kicker: 'Punkty na mapie · GRAŃ',
      heading: found.title,
      lines: [`Konto: ${user.name} (${user.email})`, status === 'pending' ? 'Czeka na zatwierdzenie w panelu.' : 'Opublikowany od razu.'],
      body: text,
    }).catch(error => console.error('Map comment mail failed:', error.message))
    res.status(201).json({ id: comment.id, status, author: user.name })
  })

  /**
   * Zdjęcie do punktu: surowy plik w treści żądania (JPEG, PNG, WEBP, HEIC). Aplikacja wysyła
   * już przeliczone zdjęcie, ale serwer i tak skaluje je do 2048 px, zapisuje jako JPEG 75 %
   * i usuwa metadane.
   */
  app.post('/api/map-points/:id/photos', cors, rawPhoto, async (req, res) => {
    const all = await readJson(FILE, [])
    const target = all.find(point => point.id === req.params.id)
    if (!target) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    const user = await accounts.authenticate(req, target.app)
    if (!user) return res.status(401).json(AUTH_ERROR)
    if (target.status === 'hidden' && target.userId !== user.id) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    if (limited(req, 'photo')) return res.status(429).json({ error: 'Za dużo zdjęć naraz – spróbuj za kilkanaście minut.' })
    const type = cleanText(req.get('content-type'), 80).split(';')[0].toLowerCase()
    if (!PHOTO_TYPES.has(type)) return res.status(415).json({ error: 'Zdjęcie musi być w formacie JPEG, PNG albo WEBP.' })
    if (!Buffer.isBuffer(req.body) || req.body.length < 100) return res.status(400).json({ error: 'Pusty plik zdjęcia.' })

    const { autoApprove, photosPerUser, photoScope } = await settings(target.app)
    const used = photoScope === 'app'
      ? all.filter(point => point.app === target.app).reduce((sum, point) => sum + ownPhotos(point, user.id).length, 0)
      : ownPhotos(target, user.id).length
    if (used >= photosPerUser) {
      const where = photoScope === 'app' ? 'w aplikacji' : 'do jednego punktu'
      return res.status(409).json({ error: `Możesz dodać najwyżej ${photosPerUser} ${photosPerUser === 1 ? 'zdjęcie' : 'zdjęcia'} ${where}.`, code: 'limit' })
    }

    let output
    try {
      output = await sharp(req.body, { failOn: 'error', limitInputPixels: 80_000_000 })
        .rotate()
        .resize(PHOTO_MAX, PHOTO_MAX, { fit: 'inside', withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
        .jpeg({ quality: PHOTO_QUALITY, mozjpeg: true })
        .toBuffer({ resolveWithObject: true })
    } catch {
      return res.status(400).json({ error: 'Nie udało się odczytać zdjęcia.' })
    }
    const id = crypto.randomUUID()
    const file = `${id}.jpg`
    await fs.mkdir(PHOTO_DIR, { recursive: true })
    await fs.writeFile(path.join(PHOTO_DIR, file), output.data, { mode: 0o644 })
    // zdjęcie do czekającego punktu i tak jest niewidoczne, dopóki punkt nie zostanie zatwierdzony
    const status = autoApprove ? 'approved' : 'pending'
    const photo = {
      id,
      file,
      userId: user.id,
      author: user.name,
      createdAt: new Date().toISOString(),
      status,
      width: output.info.width,
      height: output.info.height,
      size: output.data.length,
      ...meta(req, { platform: req.get('x-platform'), appVersion: req.get('x-app-version') }),
    }
    let stored = false
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== target.id) return point
      // drugi raz przy zapisie – równoległe wysyłki tej samej osoby
      const count = photoScope === 'app' ? used : ownPhotos(point, user.id).length
      if (count >= photosPerUser) return point
      stored = true
      return { ...point, updatedAt: photo.createdAt, photos: [...(point.photos || []), photo] }
    }))
    if (!stored) {
      await removePhotoFiles([photo])
      return res.status(409).json({ error: `Możesz dodać najwyżej ${photosPerUser} zdjęcia.`, code: 'limit' })
    }
    notifyOwner?.({
      id,
      subject: `Zdjęcie do punktu: ${target.title}`,
      kicker: 'Punkty na mapie · GRAŃ',
      heading: target.title,
      lines: [`Konto: ${user.name} (${user.email})`, `Rozmiar: ${output.info.width}×${output.info.height}, ${Math.round(output.data.length / 1024)} KB`, status === 'pending' ? 'Czeka na zatwierdzenie w panelu.' : 'Opublikowane od razu.'],
      body: '',
    }).catch(error => console.error('Map photo mail failed:', error.message))
    res.status(201).json({ id, status, url: photoUrl(photo), width: photo.width, height: photo.height })
  })

  app.post('/api/map-points/:id/report', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    if (limited(req, 'report')) return res.status(429).json({ error: 'Za dużo zgłoszeń – spróbuj później.' })
    const all = await readJson(FILE, [])
    const target = all.find(point => point.id === req.params.id)
    if (!target) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    const user = await accounts.authenticate(req, target.app)
    const client = user ? `u:${user.id}` : clientHash(body.client) || hash(req.ip)
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      const reports = point.reports || []
      if (reports.some(report => report.client === client)) return point
      const next = [...reports, { at: new Date().toISOString(), reason: cleanText(body.reason, 300), client, author: user?.name || '' }]
      // dużo zgłoszeń: punkt wraca do moderacji, dopóki moderator nie zdecyduje
      const status = point.status === 'approved' && next.length >= REPORTS_TO_HIDE && !point.trusted ? 'pending' : point.status
      return { ...point, reports: next, status }
    }))
    res.json({ ok: true })
  })

  /** Ocena punktu: +1, −1 albo 0 (cofnięcie). Jedna ocena na konto. */
  app.post('/api/map-points/:id/vote', cors, jsonBody, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const all = await readJson(FILE, [])
    const target = all.find(point => point.id === req.params.id)
    if (!target) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    const user = await accounts.authenticate(req, target.app)
    if (!user) return res.status(401).json(AUTH_ERROR)
    if (limited(req, 'vote')) return res.status(429).json({ error: 'Za dużo ocen – spróbuj później.' })
    const key = `u:${user.id}`
    const value = Number(body.value) > 0 ? 1 : Number(body.value) < 0 ? -1 : 0
    let found = null
    await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id || point.status !== 'approved') return point
      const votes = { ...(point.votes || {}) }
      if (value === 0) delete votes[key]
      else votes[key] = value
      found = { ...point, votes }
      return found
    }))
    if (!found) return res.status(404).json({ error: 'Nie ma takiego punktu.' })
    res.json(tally(found))
  })

  /* ── panel ─────────────────────────────────────────────────────────── */

  app.get('/api/admin/map-points', requireAdmin, async (req, res) => {
    const appSlug = cleanText(req.query.app, 40)
    const all = await readJson(FILE, [])
    res.json(appSlug ? all.filter(point => point.app === appSlug) : all)
  })

  /** Podgląd zdjęcia w panelu (także czekającego na zatwierdzenie). */
  app.get('/api/admin/map-points/photos/:file', requireAdmin, (req, res) => {
    const file = path.basename(cleanText(req.params.file, 80))
    if (!/^[\w-]+\.jpg$/.test(file)) return res.status(404).end()
    servePhoto(req, res, file)
  })

  /** Zatwierdzenie punktu zatwierdza też opis i zdjęcia jego autora. */
  function approve(point) {
    const owner = point.userId
    return {
      ...point,
      trusted: true,
      reports: [],
      comments: (point.comments || []).map((comment, index) => (index === 0 && comment.status === 'pending' ? { ...comment, status: 'approved' } : comment)),
      photos: (point.photos || []).map(photo => (photo.status === 'pending' && (!owner || photo.userId === owner) ? { ...photo, status: 'approved' } : photo)),
    }
  }

  app.patch('/api/admin/map-points/:id', requireAdmin, enforceSameOrigin, async (req, res) => {
    const body = req.body || {}
    if (body.status && !STATUSES.has(body.status)) return res.status(400).json({ error: 'Niepoprawny status.' })
    if (body.category && !CATEGORIES.has(body.category)) return res.status(400).json({ error: 'Niepoprawny rodzaj.' })
    const updated = await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      let next = { ...point, updatedAt: new Date().toISOString() }
      if (body.status) {
        next.status = body.status
        if (body.status === 'approved') next = approve(next)
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

  app.patch('/api/admin/map-points/:id/photos/:photoId', requireAdmin, enforceSameOrigin, async (req, res) => {
    const status = req.body?.status
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'Niepoprawny status.' })
    const updated = await updateJson(FILE, [], current => current.map(point => (point.id === req.params.id
      ? { ...point, photos: (point.photos || []).map(photo => (photo.id === req.params.photoId ? { ...photo, status } : photo)) }
      : point)))
    res.json(updated.find(point => point.id === req.params.id) || null)
  })

  app.delete('/api/admin/map-points/:id/photos/:photoId', requireAdmin, enforceSameOrigin, async (req, res) => {
    let removed = []
    const updated = await updateJson(FILE, [], current => current.map(point => {
      if (point.id !== req.params.id) return point
      removed = (point.photos || []).filter(photo => photo.id === req.params.photoId)
      return { ...point, photos: (point.photos || []).filter(photo => photo.id !== req.params.photoId) }
    }))
    await removePhotoFiles(removed)
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

  /**
   * Scalenie dwóch punktów w jeden: komentarze, zdjęcia, oceny i zgłoszenia punktu `:id`
   * przechodzą do punktu `into`, a sam punkt znika. Pierwszy komentarz scalanego punktu
   * dostaje jego tytuł, żeby opis się nie zgubił.
   */
  app.post('/api/admin/map-points/:id/merge', requireAdmin, enforceSameOrigin, async (req, res) => {
    const into = cleanText(req.body?.into, 80)
    if (!into || into === req.params.id) return res.status(400).json({ error: 'Wybierz inny punkt do scalenia.' })
    let result = null
    await updateJson(FILE, [], current => {
      const source = current.find(point => point.id === req.params.id)
      const target = current.find(point => point.id === into)
      if (!source || !target || source.app !== target.app) return current
      const comments = (source.comments || []).map((comment, index) => (index === 0 && !comment.official && source.title !== target.title
        ? { ...comment, text: `${source.title}: ${comment.text}` }
        : comment))
      const byDate = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt))
      const reports = [...(target.reports || [])]
      for (const report of source.reports || []) if (!reports.some(entry => entry.client === report.client)) reports.push(report)
      result = {
        ...target,
        updatedAt: new Date().toISOString(),
        comments: [...(target.comments || []), ...comments].sort(byDate).slice(-300),
        photos: [...(target.photos || []), ...(source.photos || [])].sort(byDate),
        votes: { ...(source.votes || {}), ...(target.votes || {}) },
        reports,
        mergedFrom: [...(target.mergedFrom || []), source.id, ...(source.mergedFrom || [])],
      }
      return current.filter(point => point.id !== source.id).map(point => (point.id === target.id ? result : point))
    })
    if (!result) return res.status(404).json({ error: 'Nie znaleziono punktów do scalenia.' })
    res.json(result)
  })

  app.delete('/api/admin/map-points/:id/comments/:commentId', requireAdmin, enforceSameOrigin, async (req, res) => {
    const updated = await updateJson(FILE, [], current => current.map(point => (
      point.id === req.params.id ? { ...point, comments: (point.comments || []).filter(comment => comment.id !== req.params.commentId) } : point
    )))
    res.json(updated.find(point => point.id === req.params.id) || null)
  })

  app.delete('/api/admin/map-points/:id', requireAdmin, enforceSameOrigin, async (req, res) => {
    let removed = []
    await updateJson(FILE, [], current => {
      removed = current.find(point => point.id === req.params.id)?.photos || []
      return current.filter(point => point.id !== req.params.id)
    })
    await removePhotoFiles(removed)
    res.json({ ok: true })
  })

  /* ── dla kont aplikacji ────────────────────────────────────────────── */

  accounts.attach({
    /** Liczby wpisów każdego konta: punkty, komentarze, zdjęcia. */
    async userStats(appSlug) {
      const stats = new Map()
      const bump = (id, key) => {
        if (!id) return
        const entry = stats.get(id) || { points: 0, comments: 0, photos: 0 }
        entry[key] += 1
        stats.set(id, entry)
      }
      for (const point of await readJson(FILE, [])) {
        if (point.app !== appSlug) continue
        bump(point.userId, 'points')
        ;(point.comments || []).forEach((comment, index) => { if (index > 0 || comment.userId !== point.userId) bump(comment.userId, 'comments') })
        ;(point.photos || []).forEach(photo => bump(photo.userId, 'photos'))
      }
      return stats
    },
    /** Liczby dla przeglądu aplikacji w panelu. */
    async appStats(appSlug) {
      const list = (await readJson(FILE, [])).filter(point => point.app === appSlug)
      const comments = list.flatMap(point => point.comments || [])
      const photos = list.flatMap(point => point.photos || [])
      return {
        points: list.length,
        pointsApproved: list.filter(point => point.status === 'approved').length,
        pointsPending: list.filter(point => point.status === 'pending').length,
        comments: comments.length,
        commentsPending: comments.filter(comment => comment.status === 'pending').length,
        photos: photos.length,
        photosPending: photos.filter(photo => photo.status === 'pending').length,
        photosBytes: photos.reduce((sum, photo) => sum + (photo.size || 0), 0),
        reported: list.filter(point => point.reports?.length).length,
      }
    },
    /**
     * Usunięcie konta: zdjęcia konta znikają (z plikami), punkty i komentarze zostają jako
     * anonimowe (bez nazwy i powiązania z kontem).
     */
    async forgetUser(appSlug, userId) {
      let removed = []
      await updateJson(FILE, [], current => current.map(point => {
        if (point.app !== appSlug) return point
        const mine = ownPhotos(point, userId)
        removed = removed.concat(mine)
        const votes = { ...(point.votes || {}) }
        delete votes[`u:${userId}`]
        return {
          ...point,
          ...(point.userId === userId ? { userId: null, author: '' } : {}),
          comments: (point.comments || []).map(comment => (comment.userId === userId ? { ...comment, userId: null, author: '' } : comment)),
          photos: (point.photos || []).filter(photo => photo.userId !== userId),
          votes,
        }
      }))
      await removePhotoFiles(removed)
    },
  })

  /** Dla dzwonka w panelu: punkty, komentarze i zdjęcia czekające na decyzję. */
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
        for (const photo of point.photos || []) {
          if (photo.status === 'pending') items.push({ id: photo.id, title: `Zdjęcie: ${point.title}`, detail: photo.author || '', createdAt: photo.createdAt })
        }
      }
      return items
    },
  }
}

export { CATEGORY_LABEL }
