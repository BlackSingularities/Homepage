import express from 'express'
import { registerResources } from './resources.mjs'
import { registerLinks, domainOf } from './links.mjs'
import { registerFeedback } from './feedback.mjs'
import { registerMapPoints } from './map-points.mjs'
import { registerAppAccounts } from './app-accounts.mjs'
import { registerGranSectors } from './gran-sectors.mjs'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import sharp from 'sharp'
import { cleanLink, cleanMedia, cleanRepo, cleanText, isEmail, slugify, uniqueSlug } from './sanitize.mjs'
import { createMail } from './mail.mjs'
import * as tpl from './email.mjs'
import { PLATFORMS, STORES, TEST_PLATFORMS, downloadsFor, storesFor, projectSummary, publicProject, sanitizeProject, totalDownloads } from './projects.mjs'
import { createReleaseService } from './github.mjs'
import { createPosterService, withPosters } from './posters.mjs'
import { writeZip } from './zip.mjs'
import { createAnalytics } from './analytics.mjs'
import { langOf, localizePage, localizeProject } from './i18n.mjs'
import { renderDocument, renderSitemap } from './seo.mjs'

const app = express()
const PORT = Number(process.env.PORT || 3001)
const DATA_DIR = process.env.DATA_DIR || '/app/data'
const SETTINGS_FILE = path.join(DATA_DIR, 'mail-settings.json')
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json')
const TESTERS_FILE = path.join(DATA_DIR, 'testers.json')
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json')
const CONTENT_FILE = path.join(DATA_DIR, 'content.json')
const CONTENT_EN_FILE = path.join(DATA_DIR, 'content.en.json')
const SITE_TEMPLATE_URL = process.env.SITE_TEMPLATE_URL || 'http://homepage/index.html'
const PAGES_FILE = path.join(DATA_DIR, 'pages.json')
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json')
const RELEASES_FILE = path.join(DATA_DIR, 'releases.json')
const POSTERS_FILE = path.join(DATA_DIR, 'posters.json')
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
const defaultContentEn = JSON.parse(
  await fs.readFile(new URL('./content.default.en.json', import.meta.url), 'utf8'),
)

/** Teksty strony per język: osobny plik zapisu i osobne wartości domyślne. */
const CONTENT_SOURCES = {
  pl: { file: CONTENT_FILE, defaults: defaultContent },
  en: { file: CONTENT_EN_FILE, defaults: defaultContentEn },
}

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
    // Bez `quality` – kwantyzacja palety (libimagequant) trwała na VPS kilka sekund na zrzut.
    if (extension === 'png') return await resized.png({ compressionLevel: 8 }).toBuffer()
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
// Załączniki idą w base64: 8 MB plików to około 11 MB treści.
const jsonMail = express.json({ limit: '12mb' })

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use((req, res, next) => {
  if (req.path === '/api/admin/resources/files') return next()
  // Raporty z aplikacji niosą stos wywołań i log – mają własny, większy limit.
  if (req.path === '/api/feedback' || req.path === '/api/app-feedback') return next()
  if (req.path === '/api/admin/mail/send' || req.path === '/api/admin/mail/draft') return jsonMail(req, res, next)
  return (req.path.startsWith('/api/admin/') ? jsonLarge : jsonSmall)(req, res, next)
})

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
function mergeContent(stored, defaults = defaultContent) {
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
  return merge(defaults, stored)
}

/** Strings only, arrays of plain objects – never trusts shapes coming from the client. */
function sanitizeContent(input, defaults = defaultContent) {
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
  const merged = walk(defaults, input)
  merged.about.image = cleanMedia(input?.about?.image) || defaults.about.image || ''
  return merged
}

async function getContent(lang = 'pl') {
  const source = CONTENT_SOURCES[langOf(lang)]
  return mergeContent(await readJson(source.file, {}), source.defaults)
}

/** Przełącznik historii zmian jest wspólny dla obu języków – trzyma go wersja polska. */
async function changelogEnabled() {
  return (await getContent('pl')).catalog.showChangelog === true
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

const posters = createPosterService({
  cacheFile: POSTERS_FILE,
  uploadDir: UPLOAD_DIR,
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
  // Repozytoria odpytujemy także bez wydań z GitHuba, żeby znać ich widoczność.
  const [map, art] = await Promise.all([
    releases.getMany(projects.map(project => project.repo)),
    // Plakaty z repozytoriów (aplikacje i serwisy webowe) idą na początek galerii (patrz posters.mjs).
    Promise.all(projects.map(project => (project.repo
      ? posters.get(project.repo, project.slug).catch(() => [])
      : []))),
  ])
  return projects.map((stored, index) => {
    const project = withPosters(stored, art[index])
    const info = map[project.repo] || null
    if (project.releaseSource === 'github') return { project, release: info }
    return { project: info?.private === false ? project : { ...project, repoHidden: true }, release: null }
  })
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

function sanitizePageTranslation(input) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    title: cleanText(source.title, 180),
    kicker: cleanText(source.kicker, 80),
    excerpt: cleanText(source.excerpt, 600),
    lead: cleanText(source.lead, 1200),
    seoDescription: cleanText(source.seoDescription, 320),
    blocks: (Array.isArray(source.blocks) ? source.blocks : []).slice(0, 60).map(sanitizeBlock),
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
    en: sanitizePageTranslation(input?.en),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function publicPage(page, lang) {
  const { en: _translation, ...localized } = localizePage(page, lang)
  return localized
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
    const result = await transport.sendMail({ ...message, attachments: [...(message.attachments || []), ...tpl.brandAttachments(message.html)] })
    log.status = 'sent'
    log.messageId = result.messageId
  } catch (error) {
    log.status = 'failed'
    log.error = cleanText(error.message, 500)
  }
  await appendOutbox(log)
  return log
}

const mail = createMail({
  getSettings,
  getTransport,
  enforceSameOrigin: (...args) => enforceSameOrigin(...args),
  appendOutbox,
  cleanText,
  // Odpowiedź przenosi nowe zgłoszenie do „W toku” i zostaje w jego historii.
  onSubmissionReply: (id, reply) => updateJson(SUBMISSIONS_FILE, [], current => current.map(item => (item.id === id
    ? { ...item, status: item.status === 'new' ? 'in-progress' : item.status, replies: [reply, ...(item.replies || [])] }
    : item))),
})

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

app.get('/api/content', async (req, res) => {
  const lang = langOf(req.query.lang)
  const [content, pages, projects, counts] = await Promise.all([
    getContent(lang),
    readJson(PAGES_FILE, []),
    publishedProjects(),
    analytics.counts(),
  ])
  res.set('Cache-Control', 'no-cache')
  res.json({
    content,
    pages: pages.filter(page => page.published !== false).sort(byOrder)
      .map(page => publicPageSummary(localizePage(page, lang))),
    projects: projects.map(({ project, release }) => projectSummary(localizeProject(project, lang), release, counts)),
  })
})

app.get('/api/pages/:slug', async (req, res) => {
  const pages = await readJson(PAGES_FILE, [])
  const page = pages.find(item => item.slug === req.params.slug && item.published !== false)
  if (!page) return res.status(404).json({ error: 'Nie znaleziono strony.' })
  res.json(publicPage(page, langOf(req.query.lang)))
})

app.get('/api/projects/:slug', async (req, res) => {
  const entries = await publishedProjects()
  const index = entries.findIndex(entry => entry.project.slug === req.params.slug)
  if (index === -1) return res.status(404).json({ error: 'Nie znaleziono realizacji.' })
  const { project, release } = entries[index]
  const [counts, changelog] = await Promise.all([analytics.counts(), changelogEnabled()])
  const neighbour = step => {
    const target = entries[(index + step + entries.length) % entries.length]
    return target && target.project.slug !== project.slug
      ? { slug: target.project.slug, name: target.project.name, kind: target.project.kind }
      : null
  }
  res.set('Cache-Control', 'no-cache')
  const lang = langOf(req.query.lang)
  res.json({ project: publicProject(localizeProject(project, lang), release, counts, { changelog }), previous: neighbour(-1), next: neighbour(1) })
})

/** Plik z dowolnego wydania trzymanego w historii, po identyfikatorze. */
function findAsset(release, assetId) {
  for (const item of [release, ...(release?.history || [])]) {
    const asset = (item?.assets || []).find(entry => entry.id === assetId)
    if (asset) return asset
  }
  return null
}

/**
 * Pobieranie plików aplikacji. Repozytoria są prywatne, więc każdy plik idzie
 * przez serwer, który dokłada token – ten nie opuszcza serwera. Nagłówek
 * `Range` przechodzi dalej, żeby aplikacje mogły wznowić przerwane pobieranie.
 * Opcjonalna nazwa pliku na końcu adresu jest tylko dla aplikacji, które
 * biorą nazwę z adresu – serwer jej nie sprawdza.
 */
app.get(['/api/projects/:slug/asset/:assetId', '/api/projects/:slug/asset/:assetId/:name'], async (req, res, next) => {
  try {
    const projects = await readProjects()
    const project = projects.find(item => item.slug === req.params.slug && item.published !== false)
    if (!project || project.releaseSource !== 'github' || !project.repo) {
      return res.status(404).json({ error: 'Nie znaleziono pliku.' })
    }
    const release = await releases.get(project.repo)
    const asset = findAsset(release, req.params.assetId)
    if (!asset) return res.status(404).json({ error: 'Nie znaleziono pliku.' })

    let file
    try {
      file = await releases.asset(project.repo, asset.id, { range: req.get('range') || '' })
    } catch (error) {
      // Bez tokenu publiczne repozytorium wciąż da się pobrać wprost z GitHuba.
      if (error.status === 409 && release.private === false && asset.directUrl) return res.redirect(302, asset.directUrl)
      throw error
    }
    res.status(file.status === 206 ? 206 : 200)
    res.set('Content-Type', asset.name.endsWith('.apk') ? 'application/vnd.android.package-archive' : file.type)
    res.set('Content-Disposition', `attachment; filename="${asset.name.replace(/[^\w.\-]/g, '_')}"`)
    res.set('Accept-Ranges', 'bytes')
    res.set('Cache-Control', 'no-store')
    if (file.range) res.set('Content-Range', file.range)
    if (file.size) res.set('Content-Length', file.size)
    for await (const chunk of file.body) res.write(chunk)
    res.end()
  } catch (error) {
    if (res.headersSent) return res.destroy(error)
    if (error.status) return res.status(error.status).json({ error: error.message })
    next(error)
  }
})

/**
 * Zamiennik `api.github.com/repos/:owner/:repo/releases` dla aktualizatorów
 * w aplikacjach. Kształt odpowiedzi jest taki sam jak w GitHubie, więc
 * aplikacja zmienia tylko adres – a pliki wskazują na proxy powyżej.
 * Udostępniamy wyłącznie repozytoria opublikowanych aplikacji z portfolio.
 */
const REPO_RENAMES = {
  'blacksingularities/openfilepowerwin': 'blacksingularities/powerdesk',
  'blacksingularities/opencall': 'blacksingularities/opendial',
}

function checksumLines(notes) {
  return String(notes || '')
    .split(/\r?\n/)
    .filter(line => /\b[0-9a-f]{64}\b/i.test(line))
    .join('\n')
}

async function updateFeed(req) {
  const asked = `${req.params.owner}/${req.params.repo}`.toLowerCase()
  // Zainstalowane wcześniej wersje pytają o repozytorium pod dawną nazwą.
  const repo = REPO_RENAMES[asked] || asked
  const projects = await readProjects()
  const project = projects.find(item => item.published !== false && item.kind === 'app'
    && item.releaseSource === 'github' && String(item.repo || '').toLowerCase() === repo)
  if (!project) return null
  const release = await releases.get(project.repo)
  if (!release?.tag) return null
  // TLS kończy się przed kontenerem, więc protokół z nagłówków bywa `http`.
  const host = req.get('host')
  const origin = `${/^(localhost|127\.)/.test(host) ? req.protocol : 'https'}://${host}`
  const page = `${origin}/portfolio/${project.slug}`
  const toGithub = item => ({
    tag_name: item.tag,
    name: item.name,
    // Aplikacje nie mogą pokazywać listy zmian – zostawiamy wyłącznie linie z sumami
    // SHA-256 (część aktualizatorów weryfikuje nimi pobrany plik).
    body: checksumLines(item.notes),
    html_url: page,
    published_at: item.publishedAt,
    prerelease: item.prerelease === true,
    draft: false,
    assets: (item.assets || []).map(asset => ({
      id: Number(asset.id),
      name: asset.name,
      size: asset.size,
      content_type: asset.contentType || 'application/octet-stream',
      download_count: asset.downloadCount,
      browser_download_url: `${origin}/api/projects/${project.slug}/asset/${asset.id}/${encodeURIComponent(asset.name)}`,
    })),
  })
  const history = release.history?.length ? release.history : [release]
  return { latest: toGithub(release), list: history.map(toGithub) }
}

// Aktualizator OpenPano pyta z webview, więc odpowiedź musi przejść przez CORS.
app.use(['/api/github', '/api/releases'], (_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})

app.get(['/api/github/repos/:owner/:repo/releases/latest', '/api/releases/repos/:owner/:repo/releases/latest'], async (req, res, next) => {
  try {
    const feed = await updateFeed(req)
    if (!feed) return res.status(404).json({ message: 'Not Found' })
    res.set('Cache-Control', 'no-cache')
    res.json(feed.latest)
  } catch (error) { next(error) }
})

app.get(['/api/github/repos/:owner/:repo/releases', '/api/releases/repos/:owner/:repo/releases'], async (req, res, next) => {
  try {
    const feed = await updateFeed(req)
    if (!feed) return res.status(404).json({ message: 'Not Found' })
    const limit = Math.min(Math.max(Number(req.query.per_page) || 30, 1), 100)
    res.set('Cache-Control', 'no-cache')
    res.json(feed.list.slice(0, limit))
  } catch (error) { next(error) }
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

/** Komunikaty formularza w języku, z którego wysłano zapytanie. */
const CONTACT_TEXT = {
  pl: {
    tooMany: 'Za dużo prób. Spróbuj ponownie za kilka minut.',
    name: 'Podaj imię.',
    email: 'Podaj poprawny adres e-mail.',
    phone: 'Podaj numer telefonu.',
    message: 'Napisz kilka zdań o swojej sprawie.',
    app: 'Wybierz aplikację.',
    requestType: 'Wybierz rodzaj zgłoszenia.',
    consent: 'Zaakceptuj zgodę na kontakt.',
    testingClosed: 'Zapisy do testów tej aplikacji są zamknięte.',
    testingPlatform: 'Wybierz platformę.',
    subject: 'Dziękuję za wiadomość – Adam Rędzikowski',
    text: name => `Cześć ${name},\n\nDziękuję za wiadomość. Otrzymałem Twoje zapytanie i wrócę z odpowiedzią możliwie szybko.\n\nAdam Rędzikowski\nredzikowski.com`,
    kicker: 'Wiadomość dotarła',
    thanks: name => `Dziękuję, ${name}.`,
    body: phone => `Otrzymałem Twoje zapytanie i zapoznam się z nim osobiście. Odpowiem ${phone ? 'telefonicznie' : 'mailowo'} możliwie szybko.`,
  },
  en: {
    tooMany: 'Too many attempts. Please try again in a few minutes.',
    name: 'Please enter your name.',
    email: 'Please enter a valid email address.',
    phone: 'Please enter your phone number.',
    message: 'Please write a few sentences about your request.',
    app: 'Please choose an app.',
    requestType: 'Please choose the type of request.',
    consent: 'Please agree to be contacted.',
    testingClosed: 'Sign-ups for testing this app are closed.',
    testingPlatform: 'Please choose a platform.',
    subject: 'Thank you for your message – Adam Rędzikowski',
    text: name => `Hi ${name},\n\nThank you for your message. I have received your enquiry and will get back to you as soon as possible.\n\nAdam Rędzikowski\nredzikowski.com`,
    kicker: 'Message received',
    thanks: name => `Thank you, ${name}.`,
    body: phone => `I have received your enquiry and will read it personally. I will get back to you by ${phone ? 'phone' : 'email'} as soon as possible.`,
  },
}

/** Rodzaje zgłoszeń dotyczących aplikacji – etykiety dla właściciela strony. */
const REQUEST_TYPE_LABEL = { bug: 'Zgłoszenie błędu', feature: 'Propozycja funkcjonalności', collaboration: 'Współpraca' }

app.post('/api/contact', async (req, res) => {
  const lang = langOf(req.body?.lang)
  const copy = CONTACT_TEXT[lang]
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const recent = (rateLimits.get(ip) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000)
  if (recent.length >= 5) {
    return res.status(429).json({ error: copy.tooMany })
  }
  recent.push(now)
  rateLimits.set(ip, recent)

  if (cleanText(req.body.website, 100)) {
    return res.status(200).json({ ok: true })
  }

  const isAppRequest = req.body.topic === 'app'
  const submission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: cleanText(req.body.name, 120),
    company: cleanText(req.body.company, 160),
    email: cleanText(req.body.email, 200).toLowerCase(),
    phone: cleanText(req.body.phone, 80),
    contactMethod: req.body.contactMethod === 'phone' ? 'phone' : 'email',
    topic: isAppRequest ? 'app' : 'project',
    app: isAppRequest ? cleanText(req.body.app, 120) : '',
    requestType: isAppRequest && Object.hasOwn(REQUEST_TYPE_LABEL, req.body.requestType) ? req.body.requestType : '',
    subject: cleanText(req.body.subject, 200),
    message: cleanText(req.body.message, 6000),
    budget: isAppRequest ? '' : cleanText(req.body.budget, 60),
    timeline: isAppRequest ? '' : cleanText(req.body.timeline, 60),
    scope: isAppRequest ? [] : (Array.isArray(req.body.scope) ? req.body.scope : []).slice(0, 12).map(item => cleanText(item, 60)).filter(Boolean),
    source: cleanText(req.body.source, 60),
    consent: req.body.consent === true,
    lang,
    status: 'new',
  }

  const errors = []
  if (submission.name.length < 2) errors.push(copy.name)
  if (!isEmail(submission.email)) errors.push(copy.email)
  if (submission.contactMethod === 'phone' && submission.phone.length < 6) errors.push(copy.phone)
  if (submission.message.length < 12) errors.push(copy.message)
  if (isAppRequest && !submission.app) errors.push(copy.app)
  if (isAppRequest && !submission.requestType) errors.push(copy.requestType)
  if (!submission.consent) errors.push(copy.consent)
  if (errors.length) return res.status(400).json({ error: errors[0], fields: errors })

  await updateJson(SUBMISSIONS_FILE, [], current => [submission, ...current].slice(0, 2000))

  let mailStatus = 'not-configured'
  try {
    const settings = await getSettings({ includePassword: true })
    const transport = getTransport(settings)
    if (transport && settings.ownerEmail) {
      const typeLabel = REQUEST_TYPE_LABEL[submission.requestType]
      const title = submission.subject || (typeLabel ? `${typeLabel} – ${submission.app}` : 'Nowy projekt')
      const rows = [
        ['Od', submission.name],
        ['Firma', submission.company],
        ['E-mail', tpl.link(`mailto:${submission.email}`, submission.email)],
        ['Telefon', submission.phone && tpl.link(`tel:${submission.phone.replace(/[^\d+]/g, '')}`, submission.phone)],
        ['Kontakt przez', submission.contactMethod === 'phone' ? 'telefon' : 'e-mail'],
        ['Aplikacja', submission.app],
        ['Rodzaj', typeLabel],
        ['Budżet', submission.budget],
        ['Termin', submission.timeline],
        ['Zakres', submission.scope.join(', ')],
        ['Język', lang === 'en' ? 'angielski' : ''],
      ]
      const plainRows = rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value.html ? value.html.replace(/<[^>]+>/g, '') : value}`)

      const ownerMail = await sendLoggedMail(transport, {
        from: { name: settings.fromName, address: settings.smtpUsername },
        to: settings.ownerEmail,
        replyTo: submission.email,
        subject: `${typeLabel ? `${typeLabel} – ${submission.app}` : 'Nowe zapytanie'}${lang === 'en' ? ' (EN)' : ''}: ${submission.subject || submission.name}`,
        text: `${title}\n\n${plainRows.join('\n')}\n\n${submission.message}`,
        html: tpl.emailFrame(`
          ${tpl.kicker('Nowe zapytanie ze strony')}
          ${tpl.heading(title)}
          ${tpl.details(rows)}
          ${tpl.messageBox(submission.message)}
          ${tpl.button(`mailto:${submission.email}?subject=${encodeURIComponent(`Re: ${title}`)}`, `Odpowiedz: ${submission.name}`)}
        `, { preheader: `${submission.name}: ${submission.message.slice(0, 120)}` }),
      }, 'notification', submission.id)

      const confirmationMail = await sendLoggedMail(transport, {
        from: { name: settings.fromName, address: settings.smtpUsername },
        to: submission.email,
        replyTo: settings.ownerEmail,
        subject: copy.subject,
        text: copy.text(submission.name),
        html: tpl.emailFrame(`
          ${tpl.kicker(copy.kicker)}
          ${tpl.heading(copy.thanks(submission.name), 30)}
          ${tpl.paragraph(copy.body(submission.contactMethod === 'phone'))}
          <div style="margin:26px 0 8px;font-size:12px;letter-spacing:.3px;color:#7d766b">${lang === 'en' ? 'Your message' : 'Twoja wiadomość'}</div>
          ${tpl.messageBox(submission.message)}
          ${tpl.signature()}
        `, { lang, preheader: copy.body(submission.contactMethod === 'phone'), contact: settings.ownerEmail }),
      }, 'confirmation', submission.id)
      mailStatus = ownerMail.status === 'sent' && confirmationMail.status === 'sent' ? 'sent' : 'partial'
    }
  } catch (error) {
    mailStatus = 'failed'
    console.error('Mail dispatch failed:', error.message)
  }

  res.status(201).json({ ok: true, id: submission.id, mailStatus })
})

/**
 * Zapis do testów aplikacji. Ponowny zapis tego samego adresu na tę samą
 * platformę kończy się tak samo jak pierwszy – nie zdradza, kto już jest na
 * liście, i nie dubluje pozycji ani powiadomień.
 */
app.post('/api/projects/:slug/testers', async (req, res) => {
  const copy = CONTACT_TEXT[langOf(req.body?.lang)]
  const key = `testers:${req.ip || 'unknown'}`
  const now = Date.now()
  const recent = (rateLimits.get(key) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000)
  if (recent.length >= 5) return res.status(429).json({ error: copy.tooMany })
  recent.push(now)
  rateLimits.set(key, recent)

  if (cleanText(req.body.website, 100)) return res.status(200).json({ ok: true })

  const project = (await readProjects()).find(item => item.slug === req.params.slug && item.published !== false)
  if (!project?.testing?.enabled) return res.status(404).json({ error: copy.testingClosed })

  const email = cleanText(req.body.email, 200).toLowerCase()
  const platform = cleanText(req.body.platform, 20)
  if (!isEmail(email)) return res.status(400).json({ error: copy.email })
  if (!TEST_PLATFORMS.includes(platform) || !project.testing.platforms.includes(platform)) {
    return res.status(400).json({ error: copy.testingPlatform })
  }
  if (req.body.consent !== true) return res.status(400).json({ error: copy.consent })

  const tester = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    projectId: project.id,
    project: project.name,
    slug: project.slug,
    platform,
    email,
    lang: langOf(req.body.lang),
    status: 'new',
  }
  let duplicate = false
  await updateJson(TESTERS_FILE, [], current => {
    duplicate = current.some(item => item.projectId === project.id && item.platform === platform && item.email === email)
    return duplicate ? current : [tester, ...current].slice(0, 5000)
  })
  if (duplicate) return res.status(201).json({ ok: true })

  try {
    const settings = await getSettings({ includePassword: true })
    const transport = getTransport(settings)
    if (transport && settings.ownerEmail) {
      await sendLoggedMail(transport, {
        from: { name: settings.fromName, address: settings.smtpUsername },
        to: settings.ownerEmail,
        replyTo: email,
        subject: `Nowy tester: ${project.name} (${platform})`,
        text: `${email} zgłasza się do testów aplikacji ${project.name} na platformie ${platform}.`,
        html: tpl.emailFrame(`
          ${tpl.kicker('Nowy tester')}
          ${tpl.heading(project.name)}
          ${tpl.details([
            ['E-mail', tpl.link(`mailto:${email}`, email)],
            ['Platforma', platform],
            ['Język', tester.lang === 'en' ? 'angielski' : 'polski'],
          ])}
        `, { preheader: `${email} – ${project.name} (${platform})` }),
      }, 'notification', tester.id)
    }
  } catch (error) {
    console.error('Mail dispatch failed:', error.message)
  }

  res.status(201).json({ ok: true })
})

/* ── SEO: sitemap i strony renderowane z meta ────────────────────────── */

/**
 * Szablon to zbudowany index.html z kontenera nginx – zawsze ten sam, który
 * dostaje przeglądarka, więc nazwy plików z hashami nie mogą się rozjechać.
 * Trzymamy go minutę, żeby nowy deploy był widoczny bez restartu API.
 */
let siteTemplate = { html: '', at: 0 }
async function readTemplate() {
  if (siteTemplate.html && Date.now() - siteTemplate.at < 60 * 1000) return siteTemplate.html
  const response = await fetch(SITE_TEMPLATE_URL, { signal: AbortSignal.timeout(3000) })
  if (!response.ok) throw new Error(`template ${response.status}`)
  const html = await response.text()
  if (!html.includes('<div id="root"></div>')) throw new Error('template without root')
  siteTemplate = { html, at: Date.now() }
  return html
}

async function publishedPages() {
  return (await readJson(PAGES_FILE, [])).filter(page => page.published !== false).sort(byOrder)
}

/** Opublikowane linki wraz z kategoriami, które coś zawierają. */
async function publishedLinks() {
  const data = await readJson(path.join(DATA_DIR, 'links.json'), { categories: [], items: [] })
  const items = data.items.filter(item => item.published).map(item => ({ ...item, domain: domainOf(item.url) }))
  return { categories: data.categories.filter(category => items.some(item => item.category === category.id)), items }
}

/** Dane dla jednego widoku – te same, które przeglądarka dostaje z API. */
async function seoData(route) {
  const { lang } = route
  const [pages, entries, counts] = await Promise.all([publishedPages(), publishedProjects(), analytics.counts()])
  const data = {
    pages: pages.map(page => localizePage(page, lang)),
    projects: entries.map(({ project, release }) => projectSummary(localizeProject(project, lang), release, counts)),
  }
  if (route.view === 'links') data.links = await publishedLinks()
  if (route.view === 'resources') data.resources = (await readJson(path.join(DATA_DIR, 'resources.json'), { items: [] })).items.filter(item => item.published)
  if (route.view === 'home' || route.view === 'catalog') data.content = await getContent(lang)
  if (route.view === 'project') {
    const entry = entries.find(item => item.project.slug === route.slug)
    if (entry) data.project = publicProject(localizeProject(entry.project, lang), entry.release, counts, { changelog: await changelogEnabled() })
  }
  if (route.view === 'page') {
    const page = pages.find(item => item.slug === route.slug)
    if (page) data.page = publicPage(page, lang)
  }
  return data
}

app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const [pages, entries] = await Promise.all([publishedPages(), publishedProjects()])
    const stamps = [...pages, ...entries.map(entry => entry.project)].map(item => item.updatedAt).filter(Boolean).sort()
    res.set('Content-Type', 'application/xml; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(renderSitemap({
      pages,
      resources: (await readJson(path.join(DATA_DIR, 'resources.json'), { items: [] })).items.filter(item => item.published),
      links: (await publishedLinks()).items,
      projects: entries.map(entry => entry.project),
      updatedAt: stamps.at(-1) || new Date().toISOString(),
    }))
  } catch (error) {
    next(error)
  }
})

/**
 * Publiczne adresy strony (nginx kieruje je tutaj). Gdy szablonu brak –
 * lokalnie albo przy błędzie obrazu – 503 każe nginxowi podać zwykły index.html.
 */
app.get(/^\/(?:en(?:\/.*)?|do-pobrania(?:\/.*)?|przydatne-linki|portfolio(?:\/.*)?|realizacje(?:\/.*)?|p\/.+)?$/, async (req, res) => {
  let template
  try {
    template = await readTemplate()
  } catch {
    return res.status(503).send('template unavailable')
  }
  try {
    const { html, status } = await renderDocument(template, req.path, seoData)
    res.status(status)
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.set('Cache-Control', 'no-cache')
    res.set('Content-Language', req.path === '/en' || req.path.startsWith('/en/') ? 'en' : 'pl')
    res.send(html)
  } catch (error) {
    console.error('SEO render failed:', error)
    res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(template)
  }
})

/* ── protected admin API ─────────────────────────────────────────────── */

await registerResources(app, { dataDir: DATA_DIR, readJson, updateJson, requireAdmin, enforceSameOrigin })
await registerLinks(app, { dataDir: DATA_DIR, uploadDir: UPLOAD_DIR, readJson, updateJson, requireAdmin, enforceSameOrigin })

/** Krótkie powiadomienie właściciela o zgłoszeniu z aplikacji – tylko gdy poczta jest skonfigurowana. */
async function notifyOwnerAboutFeedback({ id, replyTo, subject, kicker, heading, lines, body }) {
  const settings = await getSettings({ includePassword: true })
  const transport = getTransport(settings)
  if (!transport || !settings.ownerEmail) return
  await sendLoggedMail(transport, {
    from: { name: settings.fromName, address: settings.smtpUsername },
    to: settings.ownerEmail,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text: `${lines.join('\n')}\n\n${body}`,
    html: tpl.emailFrame(`
      ${tpl.kicker(kicker)}
      ${tpl.heading(heading, 26)}
      ${tpl.details(lines.map(line => {
        const at = line.indexOf(': ')
        return at > 0 ? [line.slice(0, at), line.slice(at + 2)] : ['', line]
      }))}
      ${body ? tpl.messageBox(body, { small: true }) : ''}
    `, { preheader: subject }),
  }, 'notification', id)
}

const appFeedback = registerFeedback(app, {
  dataDir: DATA_DIR, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits, readProjects,
  notifyOwner: notifyOwnerAboutFeedback,
})

// Konta użytkowników aplikacji (GRAŃ): rejestracja, aktywacja mailem, logowanie, własna poczta aplikacji.
const appAccounts = registerAppAccounts(app, {
  dataDir: DATA_DIR, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits,
  encrypt, decrypt, getSettings, getTransport, sendLoggedMail,
})

// Dane okolicy GRANI (Polska, Czechy, Słowacja) trzymane na serwerze zamiast publicznego Overpass.
registerGranSectors(app, { dataDir: DATA_DIR, readJson, updateJson, requireAdmin, rateLimits })

const mapPoints = registerMapPoints(app, {
  dataDir: DATA_DIR, readJson, updateJson, requireAdmin, enforceSameOrigin, rateLimits,
  notifyOwner: notifyOwnerAboutFeedback, accounts: appAccounts,
})

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
  // Licznik GitHuba obejmuje też pobrania spoza strony, więc obok niego
  // pokazujemy wyłącznie kliknięcia stąd: od zawsze i w wybranym okresie.
  const detail = report.downloadsDetail || []
  res.json({
    ...report,
    apps: apps.map(project => {
      const files = downloadsFor(project, releaseMap[project.repo], counts)
      const own = detail.filter(item => item.project === project.slug)
      const sitePeriod = own.reduce((sum, item) => sum + item.count, 0)
      const siteTotal = Object.entries(counts)
        .filter(([key]) => key.startsWith(`${project.slug}/`))
        .reduce((sum, [, value]) => sum + (Number(value) || 0), 0)

      // Wersje bierzemy z dziennika zdarzeń: wydanie pokazuje tylko ostatnią,
      // a dziennik pamięta też te, które już z GitHuba zniknęły.
      const byVersion = new Map()
      for (const item of own) {
        const key = item.version || '(bez numeru)'
        byVersion.set(key, (byVersion.get(key) || 0) + item.count)
      }

      return {
        slug: project.slug,
        name: project.name,
        source: project.releaseSource,
        // Starsze wydania znikają z listy plików, ale ich kliknięcia zostają
        // w liczniku – inaczej suma potrafiłaby być mniejsza niż „ze strony”.
        total: Math.max(totalDownloads(files), siteTotal),
        siteTotal,
        sitePeriod,
        versions: [...byVersion.entries()]
          .map(([version, count]) => ({ version, count }))
          .sort((a, b) => b.count - a.count),
        stores: storesFor(project).map(store => ({
          id: store.id,
          name: store.name,
          url: store.url,
          total: Number(counts[`store:${project.slug}/${store.id}`]) || 0,
          period: (report.storesDetail || []).find(item => item.key === `${project.slug}/${store.id}`)?.count || 0,
        })),
        files: files.map(file => ({
          id: file.id,
          platform: file.platform,
          label: file.label,
          version: file.version,
          count: file.count,
          site: Number(counts[`${project.slug}/${file.id}`]) || 0,
          sitePeriod: own.filter(item => item.asset === file.id).reduce((sum, item) => sum + item.count, 0),
        })),
      }
    })
      .map(app => ({ ...app, storeTotal: app.stores.reduce((sum, store) => sum + store.total, 0) }))
      .sort((a, b) => (b.total + b.storeTotal) - (a.total + a.storeTotal)),
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

/* ── admin: testerzy ─────────────────────────────────────────────────── */

app.get('/api/admin/testers', async (_req, res) => {
  res.json(await readJson(TESTERS_FILE, []))
})

// Zbiorczo, bo adresy dodaje się do sklepu całą listą naraz.
app.patch('/api/admin/testers', enforceSameOrigin, async (req, res) => {
  const status = cleanText(req.body.status, 30)
  if (!['new', 'added'].includes(status)) return res.status(400).json({ error: 'Niepoprawny status.' })
  const ids = new Set(Array.isArray(req.body.ids) ? req.body.ids : [])
  res.json(await updateJson(TESTERS_FILE, [], current =>
    current.map(item => (ids.has(item.id) ? { ...item, status } : item))))
})

app.delete('/api/admin/testers/:id', enforceSameOrigin, async (req, res) => {
  await updateJson(TESTERS_FILE, [], current => current.filter(item => item.id !== req.params.id))
  res.json({ ok: true })
})

/* ── admin: powiadomienia ────────────────────────────────────────────── */

// Skrzynka sama się nie odzywa, więc licznik nie może blokować odpowiedzi.
app.get('/api/admin/notifications', async (_req, res) => {
  const [submissions, testers, fromApps, pendingPoints] = await Promise.all([
    readJson(SUBMISSIONS_FILE, []),
    readJson(TESTERS_FILE, []),
    appFeedback.fresh(),
    mapPoints.fresh(),
  ])
  const fresh = list => list.filter(item => item.status === 'new')
  const newSubmissions = fresh(submissions)
  const newTesters = fresh(testers)
  const inbox = await Promise.race([
    mail.countUnseen(),
    new Promise(resolve => setTimeout(() => resolve(0), 1500)),
  ])
  res.json({
    counts: {
      submissions: newSubmissions.length,
      bugReports: fromApps.reports.length,
      appFeedback: fromApps.feedback.length,
      testers: newTesters.length,
      apps: pendingPoints.length,
      mail: inbox,
    },
    items: [
      ...newSubmissions.map(item => ({
        id: item.id,
        tab: 'submissions',
        title: item.subject || item.app || 'Nowe zapytanie',
        detail: item.name,
        createdAt: item.createdAt,
      })),
      ...fromApps.reports.map(item => ({
        id: item.id,
        tab: 'bugReports',
        title: `Błąd: ${item.appName}`,
        detail: `${item.appVersion || ''} · ${item.platform}${item.count > 1 ? ` · ×${item.count}` : ''}`,
        createdAt: item.lastAt || item.createdAt,
      })),
      ...fromApps.feedback.map(item => ({
        id: item.id,
        tab: 'appFeedback',
        title: `${item.kind === 'feature' ? 'Sugestia' : 'Zgłoszenie błędu'}: ${item.appName}`,
        detail: item.message.slice(0, 80),
        createdAt: item.createdAt,
      })),
      ...pendingPoints.map(item => ({ ...item, tab: 'apps', item: 'gran/punkty' })),
      ...newTesters.map(item => ({
        id: item.id,
        tab: 'testers',
        title: `Tester: ${item.project}`,
        detail: `${item.email} · ${item.platform}`,
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 10),
  })
})

/* ── admin: content ──────────────────────────────────────────────────── */

app.get('/api/admin/content', async (req, res) => {
  res.json(await getContent(req.query.lang))
})

app.put('/api/admin/content', enforceSameOrigin, async (req, res) => {
  const source = CONTENT_SOURCES[langOf(req.query.lang)]
  const sanitized = sanitizeContent(req.body, source.defaults)
  await updateJson(source.file, {}, () => sanitized)
  res.json(sanitized)
})

app.post('/api/admin/content/reset', enforceSameOrigin, async (req, res) => {
  const lang = langOf(req.query.lang)
  await updateJson(CONTENT_SOURCES[lang].file, {}, () => ({}))
  res.json(await getContent(lang))
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

/* ── admin: pobieranie wszystkich aplikacji ──────────────────────────── */

/**
 * Pliki wszystkich aplikacji z portfolio w jednym miejscu – także tych
 * ukrytych na stronie. Każdy plik ma adres w panelu, który działa niezależnie
 * od publikacji, a nazwa pliku jest prawdziwa (z wydania albo z adresu).
 */
async function adminDownloads() {
  const projects = sortProjects(await readProjects()).filter(project => project.kind === 'app')
  const map = await releases.getMany(projects.map(project => (project.releaseSource === 'github' ? project.repo : '')))
  return projects.map(project => {
    const release = map[project.repo] || null
    const files = downloadsFor(project, release).map(file => {
      const asset = project.releaseSource === 'github'
        ? [release, ...(release?.history || [])].flatMap(item => item?.assets || []).find(item => item.id === file.id)
        : null
      const fromUrl = decodeURIComponent(String(file.url || '').split(/[?#]/)[0].split('/').pop() || '')
      const name = asset?.name || (/\.[a-z0-9]{2,5}$/i.test(fromUrl) ? fromUrl : `${project.slug}-${file.platform}.${file.platform === 'android' ? 'apk' : 'bin'}`)
      return { ...file, name, href: `/api/admin/downloads/${encodeURIComponent(project.slug)}/${encodeURIComponent(file.id)}/${encodeURIComponent(name)}` }
    })
    return {
      slug: project.slug,
      name: project.name,
      repo: project.repo || '',
      published: project.published !== false,
      version: release?.tag || files[0]?.version || '',
      releasedAt: release?.publishedAt || project.release?.publishedAt || '',
      updatedAt: project.updatedAt || '',
      error: release?.error || '',
      files,
    }
  })
}

/** Strumień jednego pliku: wydanie z GitHuba przez token, ręczny wpis prosto z adresu. */
async function openDownload(project, file) {
  if (project.releaseSource === 'github') return (await releases.asset(project.repo, file.id)).body
  const url = new URL(file.url, 'http://localhost')
  if (!/^https?:$/.test(url.protocol) || url.hostname === 'localhost') throw new Error('Nieobsługiwany adres.')
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`Plik odpowiedział kodem ${response.status}.`)
  return response.body
}

app.get('/api/admin/downloads', async (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ apps: await adminDownloads() })
})

app.get('/api/admin/downloads/zip', async (req, res) => {
  const platform = String(req.query.platform || 'all')
  const projects = await readProjects()
  const apps = await adminDownloads()
  const entries = apps.flatMap(app => app.files
    .filter(file => platform === 'all' || file.platform === platform)
    .map(file => ({
      name: `${app.name.replace(/[\\/:*?"<>|]/g, '_')}/${file.name}`,
      open: () => openDownload(projects.find(item => item.slug === app.slug), file),
    })))
  if (!entries.length) return res.status(404).json({ error: 'Brak plików dla tej platformy.' })
  const stamp = new Date().toISOString().slice(0, 10)
  res.set('Content-Type', 'application/zip')
  res.set('Content-Disposition', `attachment; filename="aplikacje-${platform === 'all' ? 'wszystkie' : platform}-${stamp}.zip"`)
  res.set('Cache-Control', 'no-store')
  try {
    const failed = await writeZip(res, entries)
    if (failed.length) console.warn(`ZIP aplikacji bez: ${failed.join(', ')}`)
    res.end()
  } catch (error) {
    res.destroy(error)
  }
})

app.get('/api/admin/downloads/:slug/:fileId/:name', async (req, res, next) => {
  try {
    const projects = await readProjects()
    const project = projects.find(item => item.slug === req.params.slug)
    const app = (await adminDownloads()).find(item => item.slug === req.params.slug)
    const file = app?.files.find(item => item.id === req.params.fileId)
    if (!project || !file) return res.status(404).json({ error: 'Nie znaleziono pliku.' })
    const body = await openDownload(project, file)
    res.set('Content-Type', file.name.endsWith('.apk') ? 'application/vnd.android.package-archive' : 'application/octet-stream')
    res.set('Content-Disposition', `attachment; filename="${file.name.replace(/[^\w.\-]/g, '_')}"`)
    res.set('Cache-Control', 'no-store')
    if (file.size) res.set('Content-Length', String(file.size))
    for await (const chunk of body) res.write(chunk)
    res.end()
  } catch (error) {
    if (res.headersSent) return res.destroy(error)
    if (error.status) return res.status(error.status).json({ error: error.message })
    next(error)
  }
})

app.get('/api/admin/projects', async (_req, res) => {
  res.json({ projects: await adminProjectList(), platforms: PLATFORMS, stores: STORES.map(([id, name]) => ({ id, name })) })
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

/**
 * Sprawdza wydania wszystkich aplikacji na GitHubie i pobiera na nowo tylko te,
 * które się zmieniły (nowa wersja, inne pliki). Pozostałe wpisy zostają bez zmian.
 */
app.post('/api/admin/github/refresh-all', enforceSameOrigin, async (_req, res) => {
  const projects = (await readProjects()).filter(project => project.releaseSource === 'github' && project.repo)
  const repos = [...new Set(projects.map(project => project.repo))]
  const nameOf = repo => projects.find(project => project.repo === repo)?.name || repo
  const results = []
  // Po kilka naraz, żeby nie zasypać API GitHuba.
  for (let i = 0; i < repos.length; i += 6) {
    const batch = await Promise.all(repos.slice(i, i + 6).map(repo => releases.refreshIfChanged(repo)))
    results.push(...batch.map(({ entry, changed, previous }, index) => ({
      repo: repos[i + index],
      name: nameOf(repos[i + index]),
      tag: entry?.tag || '',
      previous,
      changed,
      error: entry?.error || '',
    })))
  }
  res.json({
    checked: results.length,
    refreshed: results.filter(item => item.changed).length,
    failed: results.filter(item => item.error).length,
    results,
  })
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
  await fs.unlink(path.join(UPLOAD_DIR, 'thumbs', `${name}.webp`)).catch(() => undefined)
  res.json({ ok: true })
})

/*
 * Miniatury list portfolio. Generowane leniwie przy pierwszym żądaniu
 * i trzymane obok uploadów, więc działają też dla starszych okładek.
 */
const THUMB_DIR = path.resolve(UPLOAD_DIR, 'thumbs')
const THUMB_SIZE = [960, 600]
const thumbJobs = new Map()

function makeThumb(source, target) {
  if (!thumbJobs.has(target)) {
    const job = (async () => {
      await fs.mkdir(THUMB_DIR, { recursive: true })
      const buffer = await sharp(source)
        .rotate()
        .resize(...THUMB_SIZE, { fit: 'cover', position: 'attention', kernel: sharp.kernel.lanczos3 })
        .webp({ quality: 82 })
        .toBuffer()
      await fs.writeFile(target, buffer)
    })().finally(() => thumbJobs.delete(target))
    thumbJobs.set(target, job)
  }
  return thumbJobs.get(target)
}

app.get('/uploads/thumbs/:file', async (req, res) => {
  const file = path.basename(req.params.file)
  if (!/^[\w\-.]+\.webp$/.test(file) || file.startsWith('.')) return res.status(404).end()
  const target = path.join(THUMB_DIR, file)
  const source = path.join(UPLOAD_DIR, file.slice(0, -'.webp'.length))
  try {
    const exists = await fs.stat(target).catch(() => null)
    if (!exists) {
      if (!(await fs.stat(source).catch(() => null))?.isFile()) return res.status(404).end()
      await makeThumb(source, target)
    }
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.sendFile(target, { maxAge: '365d' })
  } catch {
    res.status(404).end()
  }
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


mail.mount(app)

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
