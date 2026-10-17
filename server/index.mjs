import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import sharp from 'sharp'
import { cleanLink, cleanMedia, cleanRepo, cleanText, isEmail, slugify, uniqueSlug } from './sanitize.mjs'
import { PLATFORMS, downloadsFor, projectSummary, publicProject, sanitizeProject, totalDownloads } from './projects.mjs'
import { createReleaseService } from './github.mjs'
import { createAnalytics } from './analytics.mjs'

const app = express()
const PORT = Number(process.env.PORT || 3001)
const DATA_DIR = process.env.DATA_DIR || '/app/data'
const SETTINGS_FILE = path.join(DATA_DIR, 'mail-settings.json')
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json')
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json')
const CONTENT_FILE = path.join(DATA_DIR, 'content.json')
const PAGES_FILE = path.join(DATA_DIR, 'pages.json')
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json')
const RELEASES_FILE = path.join(DATA_DIR, 'releases.json')
const DOWNLOAD_COUNTS_FILE = path.join(DATA_DIR, 'download-counts.json')
const ANALYTICS_DIR = path.join(DATA_DIR, 'analytics')
const INTEGRATIONS_FILE = path.join(DATA_DIR, 'integrations.json')
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const encryptionSecret = process.env.SETTINGS_ENCRYPTION_KEY

if (!encryptionSecret) {
  throw new Error('SETTINGS_ENCRYPTION_KEY is required')
}

const encryptionKey = crypto.createHash('sha256').update(encryptionSecret).digest()
const writeQueues = new Map()
const rateLimits = new Map()
const loginRateLimits = new Map()
const SESSION_COOKIE = 'homepage_admin_session'
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

const defaultContent = JSON.parse(
  await fs.readFile(new URL('./content.default.json', import.meta.url), 'utf8'),
)

const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

const UPLOAD_MAX_DIMENSION = 2400

// Nowe zrzuty ekranu potrafią mieć po kilka MB w oryginalnej rozdzielczości –
// przeglądarka i tak skaluje je w dół do rozmiaru kontenera, co przy dużym
// źródle daje słabą interpolację. Dociskamy je tutaj raz, przy uploadzie.
async function resizeForUpload(buffer, extension) {
  if (extension === 'gif') return buffer
  try {
    const resized = sharp(buffer)
      .rotate()
      .resize(UPLOAD_MAX_DIMENSION, UPLOAD_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
    if (extension === 'png') return await resized.png({ quality: 85, compressionLevel: 9 }).toBuffer()
    if (extension === 'jpg') return await resized.jpeg({ quality: 85, progressive: true }).toBuffer()
    if (extension === 'webp') return await resized.webp({ quality: 85 }).toBuffer()
    if (extension === 'avif') return await resized.avif({ quality: 60 }).toBuffer()
    return buffer
  } catch {
    return buffer
  }
}

const jsonSmall = express.json({ limit: '64kb' })
const jsonLarge = express.json({ limit: '4mb' })

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use((req, res, next) => (req.path.startsWith('/api/admin/') ? jsonLarge : jsonSmall)(req, res, next))

await fs.mkdir(DATA_DIR, { recursive: true })
await fs.mkdir(UPLOAD_DIR, { recursive: true })

/* ── helpers ─────────────────────────────────────────────────────────── */

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => {
    const separator = part.indexOf('=')
    if (separator === -1) return ['', '']
    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    return [key, value]
  }).filter(([key]) => key))
}

function encodeSession(admin) {
  const payload = Buffer.from(JSON.stringify({
    username: admin.username,
    version: admin.sessionVersion,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', encryptionKey).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function decodeSession(token) {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return null
  const expected = crypto.createHmac('sha256', encryptionKey).update(payload).digest()
  const received = Buffer.from(signature, 'base64url')
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number(session.expiresAt) > Date.now() ? session : null
  } catch {
    return null
  }
}

function sessionCookie(value, { clear = false } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${clear ? '' : value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    clear ? 'Max-Age=0' : `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt)
  return { salt: salt.toString('base64'), hash: hash.toString('base64') }
}

async function verifyPassword(password, admin) {
  if (!admin?.salt || !admin?.hash) return false
  const expected = Buffer.from(admin.hash, 'base64')
  const actual = await scrypt(password, Buffer.from(admin.salt, 'base64'))
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

async function authenticatedAdmin(req) {
  const token = parseCookies(req.get('cookie'))[SESSION_COOKIE]
  const session = decodeSession(token)
  if (!session) return null
  const admin = await readJson(ADMIN_FILE, null)
  if (!admin || admin.username !== session.username || admin.sessionVersion !== session.version) return null
  return { username: admin.username, createdAt: admin.createdAt }
}

async function requireAdmin(req, res, next) {
  try {
    const admin = await authenticatedAdmin(req)
    if (!admin) return res.status(401).json({ error: 'Zaloguj się, aby otworzyć panel.' })
    req.admin = admin
    next()
  } catch (error) {
    next(error)
  }
}

function encrypt(value) {
  if (!value) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    value: encrypted.toString('base64'),
  }
}

function decrypt(payload) {
  if (!payload?.iv || !payload?.tag || !payload?.value) return ''
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(payload.value, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function updateJson(file, fallback, updater) {
  const previous = writeQueues.get(file) || Promise.resolve()
  const next = previous.then(async () => {
    const current = await readJson(file, fallback)
    const updated = await updater(current)
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(temporary, JSON.stringify(updated, null, 2), { mode: 0o600 })
    await fs.rename(temporary, file)
    return updated
  })
  writeQueues.set(file, next.catch(() => undefined))
  return next
}

function enforceSameOrigin(req, res, next) {
  const origin = req.get('origin')
  if (!origin) return next()
  try {
    if (new URL(origin).host !== req.get('host')) {
      return res.status(403).json({ error: 'Niedozwolone źródło żądania.' })
    }
  } catch {
    return res.status(403).json({ error: 'Niedozwolone źródło żądania.' })
  }
  next()
}

/* ── content (homepage sections) ─────────────────────────────────────── */

/** Stored content may be partial – defaults fill every gap so the site never breaks. */
function mergeContent(stored) {
  const merge = (base, override) => {
    if (Array.isArray(base)) return Array.isArray(override) ? override : base
    if (base && typeof base === 'object') {
      if (!override || typeof override !== 'object' || Array.isArray(override)) return base
      const result = { ...base }
      for (const key of Object.keys(base)) result[key] = merge(base[key], override[key])
      return result
    }
    return override === undefined || override === null ? base : override
  }
  return merge(defaultContent, stored)
}

/** Strings only, arrays of plain objects – never trusts shapes coming from the client. */
function sanitizeContent(input) {
  const walk = (base, value) => {
    if (Array.isArray(base)) {
      if (!Array.isArray(value)) return base
      const template = base[0] ?? {}
      return value.slice(0, 60).map(item => walk(template, item))
    }
    if (base && typeof base === 'object') {
      const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
      const result = {}
      for (const key of Object.keys(base)) result[key] = walk(base[key], source[key])
      return result
    }
    if (typeof base === 'number') {
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : base
    }
    if (typeof base === 'boolean') return typeof value === 'boolean' ? value : base
    if (typeof value === 'string' || typeof value === 'number') return cleanText(value, 4000)
    return typeof base === 'string' ? base : ''
  }
  const merged = walk(defaultContent, input)
  merged.about.image = cleanMedia(input?.about?.image) || defaultContent.about.image || ''
  return merged
}

async function getContent() {
  return mergeContent(await readJson(CONTENT_FILE, {}))
}

/* ── realizacje (portfolio) ──────────────────────────────────────────── */

async function getGithubToken() {
  const stored = await readJson(INTEGRATIONS_FILE, {})
  try {
    return decrypt(stored.githubToken)
  } catch {
    return ''
  }
}

const releases = createReleaseService({
  cacheFile: RELEASES_FILE,
  readJson,
  updateJson,
  getToken: getGithubToken,
})

const analytics = createAnalytics({
  dir: ANALYTICS_DIR,
  readJson,
  updateJson,
  countsFile: DOWNLOAD_COUNTS_FILE,
})
await analytics.init()
const trackLimits = new Map()

async function readProjects() {
  const stored = await readJson(PROJECTS_FILE, [])
  return Array.isArray(stored) ? stored : []
}

function sortProjects(projects) {
  return [...projects].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, 'pl'))
}

/** Opublikowane realizacje z dołożonymi plikami z najnowszych wydań. */
async function publishedProjects() {
  const projects = sortProjects(await readProjects()).filter(project => project.published !== false)
  const map = await releases.getMany(projects.map(project => (project.releaseSource === 'github' ? project.repo : '')))
  return projects.map(project => ({ project, release: map[project.repo] || null }))
}

/* ── pages (CMS subpages) ────────────────────────────────────────────── */

const BLOCK_BUILDERS = {
  text: block => ({
    heading: cleanText(block.heading, 200),
    body: cleanText(block.body, 12000),
    layout: block.layout === 'wide' ? 'wide' : 'default',
  }),
  image: block => ({
    src: cleanMedia(block.src),
    alt: cleanText(block.alt, 200),
    caption: cleanText(block.caption, 300),
    layout: block.layout === 'full' ? 'full' : 'default',
  }),
  gallery: block => ({
    heading: cleanText(block.heading, 200),
    images: (Array.isArray(block.images) ? block.images : [])
      .slice(0, 40)
      .map(image => ({ src: cleanMedia(image?.src), alt: cleanText(image?.alt, 200) }))
      .filter(image => image.src),
  }),
  features: block => ({
    heading: cleanText(block.heading, 200),
    items: (Array.isArray(block.items) ? block.items : [])
      .slice(0, 24)
      .map(item => ({ title: cleanText(item?.title, 160), text: cleanText(item?.text, 1200) }))
      .filter(item => item.title || item.text),
  }),
  stats: block => ({
    heading: cleanText(block.heading, 200),
    items: (Array.isArray(block.items) ? block.items : [])
      .slice(0, 12)
      .map(item => ({ value: cleanText(item?.value, 40), label: cleanText(item?.label, 160) }))
      .filter(item => item.value || item.label),
  }),
  quote: block => ({
    body: cleanText(block.body, 1200),
    author: cleanText(block.author, 160),
  }),
  cta: block => ({
    heading: cleanText(block.heading, 200),
    body: cleanText(block.body, 800),
    label: cleanText(block.label, 80) || 'Napisz do mnie',
    href: cleanLink(block.href, '/#kontakt'),
  }),
}

function sanitizeBlock(input) {
  const type = BLOCK_BUILDERS[input?.type] ? input.type : 'text'
  return {
    id: cleanText(input?.id, 60) || crypto.randomUUID(),
    type,
    ...BLOCK_BUILDERS[type](input || {}),
  }
}

function sanitizePage(input, existing = {}) {
  const title = cleanText(input?.title, 180) || existing.title || 'Nowa strona'
  return {
    id: existing.id || crypto.randomUUID(),
    slug: slugify(input?.slug || title),
    title,
    kicker: cleanText(input?.kicker, 80),
    excerpt: cleanText(input?.excerpt, 600),
    lead: cleanText(input?.lead, 1200),
    cover: cleanMedia(input?.cover),
    seoDescription: cleanText(input?.seoDescription, 320),
    accent: ['gold', 'ivory', 'ember', 'mint'].includes(input?.accent) ? input.accent : 'gold',
    published: input?.published !== false,
    featured: input?.featured === true,
    order: Number.isFinite(Number(input?.order)) ? Number(input.order) : 0,
    blocks: (Array.isArray(input?.blocks) ? input.blocks : []).slice(0, 60).map(sanitizeBlock),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function publicPageSummary(page) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    kicker: page.kicker,
    excerpt: page.excerpt,
    cover: page.cover,
    accent: page.accent,
    featured: page.featured,
    order: page.order,
    updatedAt: page.updatedAt,
  }
}

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.title).localeCompare(String(b.title), 'pl')

/* ── mail ────────────────────────────────────────────────────────────── */

async function getSettings({ includePassword = false } = {}) {
  const stored = await readJson(SETTINGS_FILE, {})
  const settings = {
    fromName: stored.fromName || 'Adam Rędzikowski – Digital Studio',
    ownerEmail: stored.ownerEmail || '',
    imapHost: stored.imapHost || '',
    imapPort: Number(stored.imapPort || 993),
    imapSecure: stored.imapSecure !== false,
    imapUsername: stored.imapUsername || '',
    smtpHost: stored.smtpHost || '',
    smtpPort: Number(stored.smtpPort || 465),
    smtpSecure: stored.smtpSecure !== false,
    smtpUsername: stored.smtpUsername || '',
    hasPassword: Boolean(stored.password),
  }
  if (includePassword) settings.password = decrypt(stored.password)
  return settings
}

function getTransport(settings) {
  if (!settings.smtpHost || !settings.smtpUsername || !settings.password) return null
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: { user: settings.smtpUsername, pass: settings.password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function emailFrame(content) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#0a0a0c;color:#f5f1e8;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0c;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#111114;border:1px solid #2c2a26;border-radius:16px;overflow:hidden">
          <tr><td style="padding:24px 28px;background:linear-gradient(120deg,#171410,#0e0d0c);border-bottom:1px solid #2c2a26">
            <div style="font-size:21px;font-weight:700;letter-spacing:-1px;color:#e8c583">AR</div>
            <div style="margin-top:5px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8d8579">Adam Rędzikowski · Digital Studio</div>
          </td></tr>
          <tr><td style="padding:42px 28px">${content}</td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #2c2a26;font-size:11px;color:#807a70">
            redzikowski.com · Strony internetowe, systemy webowe, AI i dane
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

async function appendOutbox(entry) {
  await updateJson(OUTBOX_FILE, [], current => [entry, ...current].slice(0, 500))
}

async function sendLoggedMail(transport, message, kind, submissionId) {
  const log = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    kind,
    submissionId,
    to: message.to,
    subject: message.subject,
    status: 'pending',
  }
  try {
    const result = await transport.sendMail(message)
    log.status = 'sent'
    log.messageId = result.messageId
  } catch (error) {
    log.status = 'failed'
    log.error = cleanText(error.message, 500)
  }
  await appendOutbox(log)
  return log
}

/* ── administrator bootstrap & session ───────────────────────────────── */

function recordLoginAttempt(ip) {
  const now = Date.now()
  const recent = (loginRateLimits.get(ip) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000)
  recent.push(now)
  loginRateLimits.set(ip, recent)
  return recent.length
}

app.get('/api/auth/status', async (req, res, next) => {
  try {
    const adminRecord = await readJson(ADMIN_FILE, null)
    const admin = adminRecord ? await authenticatedAdmin(req) : null
    res.set('Cache-Control', 'no-store')
    res.json({
      mode: adminRecord ? 'login' : 'setup',
      authenticated: Boolean(admin),
      admin,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/setup', enforceSameOrigin, async (req, res, next) => {
  try {
    if (await readJson(ADMIN_FILE, null)) {
      return res.status(409).json({ error: 'Administrator został już utworzony. Zaloguj się.' })
    }

    const username = cleanText(req.body.username, 60)
    const password = String(req.body.password || '')
    if (username.length < 3) return res.status(400).json({ error: 'Nazwa administratora musi mieć co najmniej 3 znaki.' })
    if (password.length < 10) return res.status(400).json({ error: 'Hasło musi mieć co najmniej 10 znaków.' })
    if (password.length > 200) return res.status(400).json({ error: 'Hasło jest zbyt długie.' })

    const credentials = await hashPassword(password)
    const adminRecord = {
      username,
      ...credentials,
      sessionVersion: crypto.randomBytes(16).toString('base64url'),
      createdAt: new Date().toISOString(),
    }

    try {
      await fs.writeFile(ADMIN_FILE, `${JSON.stringify(adminRecord, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    } catch (error) {
      if (error.code === 'EEXIST') {
        return res.status(409).json({ error: 'Administrator został już utworzony. Zaloguj się.' })
      }
      throw error
    }

    res.set('Set-Cookie', sessionCookie(encodeSession(adminRecord)))
    res.status(201).json({ admin: { username, createdAt: adminRecord.createdAt } })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', enforceSameOrigin, async (req, res, next) => {
  try {
    const ip = req.ip || 'unknown'
    if (recordLoginAttempt(ip) > 8) {
      return res.status(429).json({ error: 'Za dużo prób logowania. Spróbuj ponownie za 15 minut.' })
    }

    const adminRecord = await readJson(ADMIN_FILE, null)
    if (!adminRecord) return res.status(409).json({ error: 'Najpierw utwórz konto administratora.' })

    const username = cleanText(req.body.username, 60)
    const password = String(req.body.password || '')
    const validUsername = username === adminRecord.username
    const validPassword = await verifyPassword(password, adminRecord)
    if (!validUsername || !validPassword) {
      return res.status(401).json({ error: 'Nieprawidłowa nazwa administratora lub hasło.' })
    }

    loginRateLimits.delete(ip)
    res.set('Set-Cookie', sessionCookie(encodeSession(adminRecord)))
    res.json({ admin: { username: adminRecord.username, createdAt: adminRecord.createdAt } })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', enforceSameOrigin, (_req, res) => {
  res.set('Set-Cookie', sessionCookie('', { clear: true }))
  res.json({ ok: true })
})

/* ── public routes ───────────────────────────────────────────────────── */

app.get('/health', (_req, res) => res.json({ ok: true }))

app.get('/api/content', async (_req, res) => {
  const [content, pages, projects, counts] = await Promise.all([
    getContent(),
    readJson(PAGES_FILE, []),
    publishedProjects(),
    analytics.counts(),
  ])
  res.set('Cache-Control', 'no-cache')
  res.json({
    content,
    pages: pages.filter(page => page.published !== false).sort(byOrder).map(publicPageSummary),
    projects: projects.map(({ project, release }) => projectSummary(project, release, counts)),
  })
})

app.get('/api/pages/:slug', async (req, res) => {
  const pages = await readJson(PAGES_FILE, [])
  const page = pages.find(item => item.slug === req.params.slug && item.published !== false)
  if (!page) return res.status(404).json({ error: 'Nie znaleziono strony.' })
  res.json(page)
})

app.get('/api/projects/:slug', async (req, res) => {
  const entries = await publishedProjects()
  const index = entries.findIndex(entry => entry.project.slug === req.params.slug)
  if (index === -1) return res.status(404).json({ error: 'Nie znaleziono realizacji.' })
  const { project, release } = entries[index]
  const counts = await analytics.counts()
  const neighbour = step => {
    const target = entries[(index + step + entries.length) % entries.length]
    return target && target.project.slug !== project.slug
      ? { slug: target.project.slug, name: target.project.name, kind: target.project.kind }
      : null
  }
  res.set('Cache-Control', 'no-cache')
  res.json({ project: publicProject(project, release, counts), previous: neighbour(-1), next: neighbour(1) })
})

/** Proxy pobierania dla prywatnych wydań – token nie opuszcza serwera. */
app.get('/api/projects/:slug/asset/:assetId', async (req, res, next) => {
  try {
    const projects = await readProjects()
    const project = projects.find(item => item.slug === req.params.slug && item.published !== false)
    if (!project || project.releaseSource !== 'github' || !project.repo) {
      return res.status(404).json({ error: 'Nie znaleziono pliku.' })
    }
    const release = await releases.get(project.repo)
    const asset = (release?.assets || []).find(item => item.id === req.params.assetId)
    if (!asset) return res.status(404).json({ error: 'Nie znaleziono pliku.' })

    const file = await releases.asset(project.repo, asset.id)
    res.set('Content-Type', file.type)
    res.set('Content-Disposition', `attachment; filename="${asset.name.replace(/[^\w.\-]/g, '_')}"`)
    if (file.size) res.set('Content-Length', file.size)
    for await (const chunk of file.body) res.write(chunk)
    res.end()
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message })
    next(error)
  }
})

/**
 * Zdarzenia analityki z przeglądarki. Wysyłane przez `sendBeacon`, więc
 * odpowiedź jest pusta; limit chroni pliki przed zalaniem.
 */
app.post('/api/track', express.text({ type: '*/*', limit: '4kb' }), async (req, res) => {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const recent = (trackLimits.get(ip) || []).filter(timestamp => now - timestamp < 60 * 1000)
  if (recent.length >= 120) return res.status(429).end()
  trackLimits.set(ip, [...recent, now])
  if (trackLimits.size > 5000) trackLimits.clear()
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    await analytics.record(body, { agent: req.get('user-agent'), host: req.get('host') })
  } catch { /* złe dane – po cichu ignorujemy */ }
  res.status(204).end()
})

app.post('/api/contact', async (req, res) => {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const recent = (rateLimits.get(ip) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000)
  if (recent.length >= 5) {
    return res.status(429).json({ error: 'Za dużo prób. Spróbuj ponownie za kilka minut.' })
  }
  recent.push(now)
  rateLimits.set(ip, recent)

  if (cleanText(req.body.website, 100)) {
    return res.status(200).json({ ok: true })
  }

  const submission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: cleanText(req.body.name, 120),
    company: cleanText(req.body.company, 160),
    email: cleanText(req.body.email, 200).toLowerCase(),
    phone: cleanText(req.body.phone, 80),
    contactMethod: req.body.contactMethod === 'phone' ? 'phone' : 'email',
    subject: cleanText(req.body.subject, 200),
    message: cleanText(req.body.message, 6000),
    budget: cleanText(req.body.budget, 60),
    timeline: cleanText(req.body.timeline, 60),
    scope: (Array.isArray(req.body.scope) ? req.body.scope : []).slice(0, 12).map(item => cleanText(item, 60)).filter(Boolean),
    source: cleanText(req.body.source, 60),
    consent: req.body.consent === true,
    status: 'new',
  }

  const errors = []
  if (submission.name.length < 2) errors.push('Podaj imię.')
  if (!isEmail(submission.email)) errors.push('Podaj poprawny adres e-mail.')
  if (submission.contactMethod === 'phone' && submission.phone.length < 6) errors.push('Podaj numer telefonu.')
  if (submission.message.length < 12) errors.push('Napisz kilka zdań o projekcie.')
  if (!submission.consent) errors.push('Zaakceptuj zgodę na kontakt.')
  if (errors.length) return res.status(400).json({ error: errors[0], fields: errors })

  await updateJson(SUBMISSIONS_FILE, [], current => [submission, ...current].slice(0, 2000))

  let mailStatus = 'not-configured'
  try {
    const settings = await getSettings({ includePassword: true })
    const transport = getTransport(settings)
    if (transport && settings.ownerEmail) {
      const replyLabel = submission.contactMethod === 'phone'
        ? `Telefon: ${escapeHtml(submission.phone)}`
        : `E-mail: ${escapeHtml(submission.email)}`
      const details = [
        submission.budget && `Budżet: ${submission.budget}`,
        submission.timeline && `Termin: ${submission.timeline}`,
        submission.scope.length && `Zakres: ${submission.scope.join(', ')}`,
      ].filter(Boolean)

      const ownerMail = await sendLoggedMail(transport, {
        from: { name: settings.fromName, address: settings.smtpUsername },
        to: settings.ownerEmail,
        replyTo: submission.email,
        subject: `Nowe zapytanie: ${submission.subject || submission.name}`,
        text: `${submission.name}\n${submission.company}\n${replyLabel}\n${details.join('\n')}\n\n${submission.message}`,
        html: emailFrame(`
          <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#d9b66b">Nowe zapytanie ze strony</div>
          <h1 style="font-size:32px;line-height:1.1;margin:15px 0 25px;color:#f7f2e8">${escapeHtml(submission.subject || 'Nowy projekt')}</h1>
          <p style="line-height:1.7;color:#cfc8bb"><b style="color:#fff">${escapeHtml(submission.name)}</b>${submission.company ? ` · ${escapeHtml(submission.company)}` : ''}<br>${replyLabel}</p>
          ${details.length ? `<p style="line-height:1.8;font-size:13px;color:#a49d91">${details.map(escapeHtml).join('<br>')}</p>` : ''}
          <div style="margin-top:28px;padding:22px;background:#17161a;border:1px solid #2c2a26;border-radius:12px;line-height:1.7;white-space:pre-wrap;color:#e7e1d6">${escapeHtml(submission.message)}</div>
        `),
      }, 'notification', submission.id)

      const confirmationMail = await sendLoggedMail(transport, {
        from: { name: settings.fromName, address: settings.smtpUsername },
        to: submission.email,
        replyTo: settings.ownerEmail,
        subject: 'Dziękuję za wiadomość – Adam Rędzikowski',
        text: `Cześć ${submission.name},\n\nDziękuję za wiadomość. Otrzymałem Twoje zapytanie i wrócę z odpowiedzią możliwie szybko.\n\nAdam Rędzikowski\nredzikowski.com`,
        html: emailFrame(`
          <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#d9b66b">Wiadomość dotarła</div>
          <h1 style="font-size:34px;line-height:1.1;margin:15px 0 22px;color:#f7f2e8">Dziękuję, ${escapeHtml(submission.name)}.</h1>
          <p style="font-size:16px;line-height:1.7;margin:0;color:#cfc8bb">Otrzymałem Twoje zapytanie i zapoznam się z nim osobiście. Odpowiem ${submission.contactMethod === 'phone' ? 'telefonicznie' : 'mailowo'} możliwie szybko.</p>
          <p style="margin:32px 0 0;line-height:1.6;color:#e7e1d6">Adam Rędzikowski<br><span style="color:#8d8579">Digital Studio</span></p>
        `),
      }, 'confirmation', submission.id)
      mailStatus = ownerMail.status === 'sent' && confirmationMail.status === 'sent' ? 'sent' : 'partial'
    }
  } catch (error) {
    mailStatus = 'failed'
    console.error('Mail dispatch failed:', error.message)
  }

  res.status(201).json({ ok: true, id: submission.id, mailStatus })
})

/* ── protected admin API ─────────────────────────────────────────────── */

app.use('/api/admin', requireAdmin)

/* ── admin: submissions ──────────────────────────────────────────────── */

app.get('/api/admin/analytics', async (req, res) => {
  const [report, projects, counts] = await Promise.all([
    analytics.report({ days: req.query.days }),
    readProjects(),
    analytics.counts(),
  ])
  const apps = projects.filter(project => project.kind === 'app')
  const releaseMap = await releases.getMany(apps.filter(p => p.releaseSource === 'github').map(p => p.repo))
  res.json({
    ...report,
    apps: apps.map(project => {
      const files = downloadsFor(project, releaseMap[project.repo], counts)
      return {
        slug: project.slug,
        name: project.name,
        source: project.releaseSource,
        total: totalDownloads(files),
        files: files.map(file => ({ id: file.id, platform: file.platform, label: file.label, version: file.version, count: file.count })),
      }
    }).sort((a, b) => b.total - a.total),
  })
})

app.get('/api/admin/submissions', async (_req, res) => {
  res.json(await readJson(SUBMISSIONS_FILE, []))
})

app.patch('/api/admin/submissions/:id', enforceSameOrigin, async (req, res) => {
  const allowed = new Set(['new', 'in-progress', 'closed'])
  const status = cleanText(req.body.status, 30)
  if (!allowed.has(status)) return res.status(400).json({ error: 'Niepoprawny status.' })
  const updated = await updateJson(SUBMISSIONS_FILE, [], current =>
    current.map(item => item.id === req.params.id ? { ...item, status } : item))
  res.json(updated.find(item => item.id === req.params.id))
})

app.delete('/api/admin/submissions/:id', enforceSameOrigin, async (req, res) => {
  await updateJson(SUBMISSIONS_FILE, [], current => current.filter(item => item.id !== req.params.id))
  res.json({ ok: true })
})

/* ── admin: content ──────────────────────────────────────────────────── */

app.get('/api/admin/content', async (_req, res) => {
  res.json(await getContent())
})

app.put('/api/admin/content', enforceSameOrigin, async (req, res) => {
  const sanitized = sanitizeContent(req.body)
  await updateJson(CONTENT_FILE, {}, () => sanitized)
  res.json(sanitized)
})

app.post('/api/admin/content/reset', enforceSameOrigin, async (_req, res) => {
  await updateJson(CONTENT_FILE, {}, () => ({}))
  res.json(await getContent())
})

/* ── admin: pages ────────────────────────────────────────────────────── */

app.get('/api/admin/pages', async (_req, res) => {
  const pages = await readJson(PAGES_FILE, [])
  res.json([...pages].sort(byOrder))
})

app.post('/api/admin/pages', enforceSameOrigin, async (req, res) => {
  let created
  await updateJson(PAGES_FILE, [], current => {
    const page = sanitizePage(req.body)
    page.slug = uniqueSlug(page.slug, current, page.id)
    page.order = Number.isFinite(Number(req.body?.order)) ? Number(req.body.order) : current.length
    created = page
    return [...current, page]
  })
  res.status(201).json(created)
})

app.put('/api/admin/pages/:id', enforceSameOrigin, async (req, res) => {
  let saved = null
  await updateJson(PAGES_FILE, [], current => {
    const existing = current.find(page => page.id === req.params.id)
    if (!existing) return current
    const page = sanitizePage(req.body, existing)
    page.slug = uniqueSlug(page.slug, current, existing.id)
    saved = page
    return current.map(item => item.id === existing.id ? page : item)
  })
  if (!saved) return res.status(404).json({ error: 'Nie znaleziono strony.' })
  res.json(saved)
})

app.delete('/api/admin/pages/:id', enforceSameOrigin, async (req, res) => {
  await updateJson(PAGES_FILE, [], current => current.filter(page => page.id !== req.params.id))
  res.json({ ok: true })
})

app.post('/api/admin/pages/reorder', enforceSameOrigin, async (req, res) => {
  const order = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(id => cleanText(id, 60))
  const updated = await updateJson(PAGES_FILE, [], current =>
    current.map(page => {
      const index = order.indexOf(page.id)
      return index === -1 ? page : { ...page, order: index }
    }))
  res.json([...updated].sort(byOrder))
})

/* ── admin: realizacje ───────────────────────────────────────────────── */

/** Panel widzi też stan odpytywania GitHuba, żeby błąd tokenu nie był niewidzialny. */
async function adminProjectList() {
  const projects = sortProjects(await readProjects())
  const map = await releases.getMany(projects.map(project => (project.releaseSource === 'github' ? project.repo : '')))
  return projects.map(project => ({
    ...project,
    release: project.releaseSource === 'github' ? map[project.repo] || null : null,
  }))
}

app.get('/api/admin/projects', async (_req, res) => {
  res.json({ projects: await adminProjectList(), platforms: PLATFORMS })
})

app.post('/api/admin/projects', enforceSameOrigin, async (req, res) => {
  const current = await readProjects()
  const project = sanitizeProject(req.body)
  project.slug = uniqueSlug(project.slug, current, project.id)
  project.order = current.length
  await updateJson(PROJECTS_FILE, [], list => [...list, project])
  res.status(201).json(project)
})

app.put('/api/admin/projects/:id', enforceSameOrigin, async (req, res) => {
  const current = await readProjects()
  const existing = current.find(item => item.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Nie znaleziono realizacji.' })
  const project = sanitizeProject({ ...req.body, order: req.body?.order ?? existing.order }, existing)
  project.slug = uniqueSlug(project.slug, current, project.id)
  await updateJson(PROJECTS_FILE, [], list => list.map(item => (item.id === project.id ? project : item)))
  if (project.releaseSource === 'github' && project.repo && project.repo !== existing.repo) {
    await releases.refresh(project.repo)
  }
  res.json(project)
})

app.delete('/api/admin/projects/:id', enforceSameOrigin, async (req, res) => {
  await updateJson(PROJECTS_FILE, [], list => list.filter(item => item.id !== req.params.id))
  res.json({ ok: true })
})

app.post('/api/admin/projects/reorder', enforceSameOrigin, async (req, res) => {
  const order = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(id => cleanText(id, 60))
  await updateJson(PROJECTS_FILE, [], current =>
    current.map(project => {
      const index = order.indexOf(project.id)
      return index === -1 ? project : { ...project, order: index }
    }))
  res.json(await adminProjectList())
})

app.post('/api/admin/projects/:id/release', enforceSameOrigin, async (req, res) => {
  const project = (await readProjects()).find(item => item.id === req.params.id)
  if (!project?.repo) return res.status(409).json({ error: 'Najpierw wpisz repozytorium w formacie owner/nazwa.' })
  res.json(await releases.refresh(project.repo))
})

/** Podgląd wydania przed zapisaniem projektu – panel sprawdza wpisane repozytorium. */
app.post('/api/admin/github/release', enforceSameOrigin, async (req, res) => {
  const repo = cleanRepo(req.body?.repo)
  if (!repo) return res.status(400).json({ error: 'Podaj repozytorium w formacie owner/nazwa.' })
  res.json(await releases.refresh(repo))
})

app.get('/api/admin/github', async (_req, res) => {
  res.json(await releases.check())
})

app.put('/api/admin/github', enforceSameOrigin, async (req, res) => {
  const token = cleanText(req.body?.token, 300)
  const previous = await readJson(INTEGRATIONS_FILE, {})
  await updateJson(INTEGRATIONS_FILE, {}, () => ({
    githubToken: req.body?.clear === true ? null : (token ? encrypt(token) : previous.githubToken || null),
    updatedAt: new Date().toISOString(),
  }))
  res.json(await releases.check())
})

/* ── admin: media ────────────────────────────────────────────────────── */

app.post(
  '/api/admin/upload',
  enforceSameOrigin,
  express.raw({ type: Object.keys(IMAGE_TYPES), limit: '10mb' }),
  async (req, res) => {
    const extension = IMAGE_TYPES[cleanText(req.get('content-type'), 80).split(';')[0]]
    if (!extension) return res.status(415).json({ error: 'Dozwolone formaty: PNG, JPG, WEBP, AVIF, GIF.' })
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Pusty plik.' })
    }
    const base = slugify(cleanText(req.get('x-file-name'), 120).replace(/\.[a-z0-9]+$/i, ''), 'obraz').slice(0, 48)
    const name = `${base}-${crypto.randomBytes(4).toString('hex')}.${extension}`
    const processed = await resizeForUpload(req.body, extension)
    await fs.writeFile(path.join(UPLOAD_DIR, name), processed, { mode: 0o644 })
    res.status(201).json({ url: `/uploads/${name}`, name, size: processed.length })
  },
)

app.get('/api/admin/media', async (_req, res) => {
  const files = await fs.readdir(UPLOAD_DIR).catch(() => [])
  const media = await Promise.all(
    files
      .filter(name => Object.values(IMAGE_TYPES).includes(name.split('.').pop()?.toLowerCase()))
      .map(async name => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, name)).catch(() => null)
        return stat && { name, url: `/uploads/${name}`, size: stat.size, createdAt: stat.mtime.toISOString() }
      }),
  )
  res.json(media.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

app.delete('/api/admin/media/:name', enforceSameOrigin, async (req, res) => {
  const name = path.basename(cleanText(req.params.name, 200))
  if (!name || name.startsWith('.')) return res.status(400).json({ error: 'Niepoprawna nazwa pliku.' })
  await fs.unlink(path.join(UPLOAD_DIR, name)).catch(() => undefined)
  res.json({ ok: true })
})

app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  dotfiles: 'deny',
  maxAge: '365d',
  setHeaders: response => response.setHeader('X-Content-Type-Options', 'nosniff'),
}))

/* ── admin: mail settings & mailboxes ────────────────────────────────── */

app.get('/api/admin/settings', async (_req, res) => {
  res.json(await getSettings())
})

app.put('/api/admin/settings', enforceSameOrigin, async (req, res) => {
  const previous = await readJson(SETTINGS_FILE, {})
  const password = cleanText(req.body.password, 500)
  const updated = {
    fromName: cleanText(req.body.fromName, 150) || 'Adam Rędzikowski – Digital Studio',
    ownerEmail: cleanText(req.body.ownerEmail, 200).toLowerCase(),
    imapHost: cleanText(req.body.imapHost, 250),
    imapPort: Number(req.body.imapPort) || 993,
    imapSecure: req.body.imapSecure !== false,
    imapUsername: cleanText(req.body.imapUsername, 250),
    smtpHost: cleanText(req.body.smtpHost, 250),
    smtpPort: Number(req.body.smtpPort) || 465,
    smtpSecure: req.body.smtpSecure !== false,
    smtpUsername: cleanText(req.body.smtpUsername, 250),
    password: password ? encrypt(password) : previous.password || null,
    updatedAt: new Date().toISOString(),
  }
  if (updated.ownerEmail && !isEmail(updated.ownerEmail)) {
    return res.status(400).json({ error: 'Niepoprawny adres odbiorcy powiadomień.' })
  }
  await updateJson(SETTINGS_FILE, {}, () => updated)
  res.json(await getSettings())
})

app.get('/api/admin/inbox', async (req, res) => {
  let client
  try {
    const settings = await getSettings({ includePassword: true })
    if (!settings.imapHost || !settings.imapUsername || !settings.password) {
      return res.status(409).json({ error: 'Najpierw uzupełnij ustawienia IMAP.' })
    }
    client = new ImapFlow({
      host: settings.imapHost,
      port: settings.imapPort,
      secure: settings.imapSecure,
      auth: { user: settings.imapUsername, pass: settings.password },
      logger: false,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    })
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    const messages = []
    try {
      const count = client.mailbox.exists
      if (count > 0) {
        const start = Math.max(1, count - 24)
        for await (const message of client.fetch(`${start}:*`, { envelope: true, source: true, flags: true })) {
          const parsed = await simpleParser(message.source)
          messages.push({
            uid: message.uid,
            subject: cleanText(parsed.subject || '(bez tematu)', 300),
            from: cleanText(parsed.from?.text || '', 300),
            to: cleanText(parsed.to?.text || '', 300),
            date: parsed.date?.toISOString() || null,
            text: cleanText(parsed.text || parsed.html || '', 5000),
            seen: message.flags?.has('\\Seen') || false,
          })
        }
      }
    } finally {
      lock.release()
    }
    res.json(messages.reverse())
  } catch (error) {
    res.status(502).json({ error: `Nie udało się połączyć ze skrzynką: ${cleanText(error.message, 250)}` })
  } finally {
    if (client) await client.logout().catch(() => undefined)
  }
})

app.get('/api/admin/outbox', async (_req, res) => {
  res.json(await readJson(OUTBOX_FILE, []))
})

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Przesłane dane są zbyt duże.' })
  }
  res.status(500).json({ error: 'Wystąpił błąd serwera.' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Homepage API listening on ${PORT}`)
})
