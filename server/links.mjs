import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import dns from 'node:dns/promises'
import net from 'node:net'
import sharp from 'sharp'
import { cleanMedia, cleanText, slugify } from './sanitize.mjs'
import { browserPath, captureScreenshot } from './screenshot.mjs'

/**
 * Przydatne linki – katalog polecanych stron z kategoriami.
 *
 * Dane leżą w `links.json`, ikony stron w `uploads/link-icons/`. Panel może
 * odpytać adres (`/api/admin/links/inspect`): serwer sam pobiera tytuł, opis
 * i ikonę, więc odwiedzający nie łączą się z obcymi serwerami, dopóki nie
 * klikną linku. Pobieranie przechodzi wyłącznie do publicznych adresów IP.
 */

const MAX_HTML = 768 * 1024
const MAX_ICON = 1024 * 1024
const TIMEOUT = 8000
const ICON_SIZE = 96
const SHOT_SIZE = [800, 500]
const RETRY_FAILED_SHOT = 24 * 3600 * 1000
const USER_AGENT = 'Mozilla/5.0 (compatible; redzikowski.com link preview)'

export const DEFAULT_LINK_CATEGORIES = [
  { id: 'narzedzia', name: 'Narzędzia' },
  { id: 'nauka', name: 'Nauka' },
  { id: 'inspiracje', name: 'Inspiracje' },
]

/* ── adresy ──────────────────────────────────────────────────────────── */

/** Normalizuje adres wpisany w panelu; brak protokołu = https. */
export function cleanUrl(value) {
  let raw = cleanText(value, 2000)
  if (!raw) return ''
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw.replace(/^\/+/, '')}`
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) return ''
    url.hash = url.hash.length > 1 ? url.hash : ''
    return url.toString()
  } catch {
    return ''
  }
}

/** Ikona z biblioteki mediów albo pobrana przez serwer (z parametrem wersji). */
function cleanIcon(value) {
  const [file, query = ''] = cleanText(value, 400).split('?')
  if (!cleanMedia(file)) return ''
  return /^v=[\w-]{1,20}$/.test(query) ? `${file}?${query}` : file
}

export const domainOf = url => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function privateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || b === 0))
      || (a === 198 && (b === 18 || b === 19))
  }
  const v6 = address.toLowerCase()
  if (v6.startsWith('::ffff:')) return privateAddress(v6.slice(7))
  return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith('ff')
}

/** Sprawdzony publiczny adres IP hosta – albo wyjątek. */
async function publicAddress(hostname) {
  const host = String(hostname).replace(/^\[|\]$/g, '')
  if (!host.includes('.') && !net.isIP(host)) throw new Error('Ten adres nie jest publiczny.')
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|homepage[\w-]*)$/i.test(host)) throw new Error('Ten adres nie jest publiczny.')
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => [])
  if (!addresses.length) throw new Error('Nie znaleziono tej domeny.')
  if (addresses.some(entry => privateAddress(entry.address))) throw new Error('Ten adres nie jest publiczny.')
  return addresses[0].address
}

const assertPublic = async url => { await publicAddress(new URL(url).hostname) }

/** fetch z kontrolą każdego przekierowania i limitem rozmiaru odpowiedzi. */
async function safeFetch(url, { accept, max }) {
  let current = url
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(current)
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'pl,en;q=0.8' },
    })
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      current = new URL(response.headers.get('location'), current).toString()
      if (!/^https?:/.test(current)) throw new Error('Nieobsługiwane przekierowanie.')
      await response.body?.cancel().catch(() => {})
      continue
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      throw new Error(`Strona odpowiedziała kodem ${response.status}.`)
    }
    const chunks = []
    let size = 0
    for await (const chunk of response.body) {
      chunks.push(chunk)
      size += chunk.length
      if (size >= max) break
    }
    return { url: current, type: response.headers.get('content-type') || '', body: Buffer.concat(chunks).subarray(0, max) }
  }
  throw new Error('Za dużo przekierowań.')
}

/* ── HTML ────────────────────────────────────────────────────────────── */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', bdquo: '„', rdquo: '”', ldquo: '“', rsquo: '’', lsquo: '‘', middot: '·', copy: '©', reg: '®', trade: '™' }

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      try { return String.fromCodePoint(value) } catch { return whole }
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

const tidy = (value, max) => decodeEntities(String(value || '')).replace(/\s+/g, ' ').trim().slice(0, max)

function attributes(tag) {
  const result = {}
  for (const match of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    result[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? ''
  }
  return result
}

function decodeHtml(buffer, contentType) {
  const head = buffer.subarray(0, 4096).toString('latin1')
  const charset = (contentType.match(/charset=([\w-]+)/i)?.[1]
    || head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1]
    || 'utf-8').toLowerCase()
  try { return new TextDecoder(charset).decode(buffer) } catch { return buffer.toString('utf8') }
}

/** Tytuł, opis, nazwa serwisu i kandydaci na ikonę – z samego `<head>`. */
export function parseHtml(html, base) {
  const head = html.slice(0, html.search(/<body[\s>]/i) > 0 ? html.search(/<body[\s>]/i) : 200000)
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]))
  const meta = (...names) => {
    for (const name of names) {
      const found = metas.find(entry => (entry.property || entry.name || '').toLowerCase() === name && entry.content)
      if (found) return found.content
    }
    return ''
  }
  const title = meta('og:title', 'twitter:title') || head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''
  // Favicony (`rel="icon"`) – wektorowe i większe przodem. Ikony Apple to
  // osobna, zapasowa lista: bywają zupełnie innym obrazkiem niż favicon.
  const links = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map(match => attributes(match[0]))
    .filter(link => link.href && link.rel)
    .map(link => {
      const size = Math.max(0, ...String(link.sizes || '').split(/\s+/).map(entry => (entry === 'any' ? 512 : Number(entry.split(/x/i)[0]) || 0)))
      const rel = link.rel.toLowerCase().split(/\s+/)
      const svg = /svg/i.test(link.type || '') || /\.svg(\?|$)/i.test(link.href)
      const kind = rel.includes('icon') ? 'icon' : rel.some(entry => entry.startsWith('apple-touch-icon')) ? 'apple' : ''
      try { return kind && { kind, href: new URL(decodeEntities(link.href), base).toString(), score: svg ? 1000 : size || 32 } } catch { return null }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
  return {
    title: tidy(title, 200),
    description: tidy(meta('og:description', 'description', 'twitter:description'), 600),
    siteName: tidy(meta('og:site_name', 'application-name'), 120),
    icons: links.filter(link => link.kind === 'icon').map(link => link.href),
    appleIcons: links.filter(link => link.kind === 'apple').map(link => link.href),
  }
}

/* ── ikony ───────────────────────────────────────────────────────────── */

/** Z pliku ICO wybiera największy obraz: PNG wprost, 32-bitowy BMP przez rozpakowanie pikseli. */
async function decodeIco(buffer) {
  if (buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) return null
  const count = buffer.readUInt16LE(4)
  const entries = []
  for (let i = 0; i < count && 6 + i * 16 + 16 <= buffer.length; i++) {
    const offset = 6 + i * 16
    entries.push({ size: buffer[offset] || 256, length: buffer.readUInt32LE(offset + 8), start: buffer.readUInt32LE(offset + 12) })
  }
  for (const entry of entries.sort((a, b) => b.size - a.size)) {
    const data = buffer.subarray(entry.start, entry.start + entry.length)
    if (data.length < 40) continue
    if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return data
    const headerSize = data.readUInt32LE(0)
    const width = data.readInt32LE(4)
    const height = Math.abs(data.readInt32LE(8)) / 2
    const bpp = data.readUInt16LE(14)
    if (bpp !== 32 || !width || !height || width > 256) continue
    const pixels = Buffer.alloc(width * height * 4)
    for (let y = 0; y < height; y++) {
      const row = headerSize + (height - 1 - y) * width * 4
      for (let x = 0; x < width; x++) {
        const source = row + x * 4
        if (source + 4 > data.length) return null
        const target = (y * width + x) * 4
        pixels[target] = data[source + 2]
        pixels[target + 1] = data[source + 1]
        pixels[target + 2] = data[source]
        pixels[target + 3] = data[source + 3]
      }
    }
    return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer()
  }
  return null
}

async function toIcon(buffer) {
  const source = buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1 ? await decodeIco(buffer) : buffer
  if (!source) return null
  const image = sharp(source, { density: 300 })
  const { width = 0, height = 0 } = await image.metadata()
  if (width < 16 || height < 16) return null
  return image
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/* ── moduł ───────────────────────────────────────────────────────────── */

export async function registerLinks(app, { dataDir, uploadDir, readJson, updateJson, requireAdmin, enforceSameOrigin }) {
  const file = path.join(dataDir, 'links.json')
  const iconDir = path.join(uploadDir, 'link-icons')
  const shotDir = path.join(uploadDir, 'link-shots')
  await fs.mkdir(iconDir, { recursive: true })
  await fs.mkdir(shotDir, { recursive: true })
  await updateJson(file, null, current => current || { categories: DEFAULT_LINK_CATEGORIES, items: [] })

  const load = () => readJson(file, { categories: [], items: [] })
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.title).localeCompare(String(b.title), 'pl')
  const publicItem = ({ clicks, shotAt, shotFailedAt, note, ...item }) => ({ ...item, domain: domainOf(item.url) })
  const fileKey = url => crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)
  const stamp = () => Date.now().toString(36)

  /** Favicon strony jako PNG 96×96; ikony Apple dopiero, gdy faviconu brak. */
  async function fetchIcon(meta, pageUrl) {
    const origin = new URL(pageUrl).origin
    const list = [...new Set([
      ...meta.icons,
      `${origin}/favicon.ico`,
      `${origin}/favicon.svg`,
      ...(meta.appleIcons || []),
      `${origin}/apple-touch-icon.png`,
    ])].slice(0, 8)
    for (const candidate of list) {
      try {
        const { body } = await safeFetch(candidate, { accept: 'image/*,*/*;q=0.5', max: MAX_ICON })
        const png = await toIcon(body)
        if (!png) continue
        const name = `${fileKey(domainOf(pageUrl))}.png`
        await fs.writeFile(path.join(iconDir, name), png)
        return `/uploads/link-icons/${name}?v=${stamp()}`
      } catch { /* następny kandydat */ }
    }
    return ''
  }

  /** Zrzut górnej części strony – WebP 800×500 do miniatury karty. */
  async function makeShot(url) {
    const png = await captureScreenshot(url, { resolve: publicAddress })
    const webp = await sharp(png)
      .resize(...SHOT_SIZE, { fit: 'cover', position: 'top', kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 80, effort: 5 })
      .toBuffer()
    const name = `${fileKey(url)}.webp`
    await fs.writeFile(path.join(shotDir, name), webp)
    return `/uploads/link-shots/${name}?v=${stamp()}`
  }

  async function readPage(url) {
    const page = await safeFetch(url, { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', max: MAX_HTML })
    const html = /html|xml/i.test(page.type) || !page.type ? decodeHtml(page.body, page.type) : ''
    return { url: page.url, meta: html ? parseHtml(html, page.url) : { title: '', description: '', siteName: '', icons: [], appleIcons: [] } }
  }

  const patchItem = (id, patch) => updateJson(file, null, current => (current?.items.some(item => item.id === id)
    ? { ...current, items: current.items.map(item => (item.id === id ? { ...item, ...patch } : item)) }
    : current))

  /*
   * Kolejka miniatur: po starcie i po każdym zapisie dorabia zrzuty linkom,
   * które ich nie mają. Przy pierwszym zrzucie odświeża też automatyczną
   * ikonę (favicon), więc starsze linki same przechodzą na nowe zasady.
   */
  let working = false
  let again = false
  async function processMissingShots() {
    if (working) { again = true; return }
    if (!browserPath()) return
    working = true
    try {
      do {
        again = false
        const { items } = await load()
        const now = Date.now()
        const pending = items.filter(item => !item.shot && !(item.shotFailedAt && now - Date.parse(item.shotFailedAt) < RETRY_FAILED_SHOT))
        for (const item of pending) {
          const patch = {}
          try {
            patch.shot = await makeShot(item.url)
            patch.shotAt = new Date().toISOString()
            patch.shotFailedAt = undefined
          } catch (error) {
            console.warn(`[links] zrzut ${item.url}: ${error.message}`)
            patch.shotFailedAt = new Date().toISOString()
          }
          if (!item.shotAt && (!item.icon || item.icon.startsWith('/uploads/link-icons/'))) {
            const icon = await readPage(item.url).then(page => fetchIcon(page.meta, page.url)).catch(() => '')
            if (icon) patch.icon = icon
          }
          // Zapis tylko, gdy w międzyczasie nikt nie zmienił adresu.
          await updateJson(file, null, current => (current?.items.some(entry => entry.id === item.id && entry.url === item.url)
            ? { ...current, items: current.items.map(entry => (entry.id === item.id ? { ...entry, ...patch } : entry)) }
            : current))
        }
      } while (again)
    } finally {
      working = false
    }
  }
  setTimeout(() => processMissingShots().catch(error => console.warn('[links] kolejka zrzutów:', error.message)), 15_000)

  app.get('/api/links', async (_req, res) => {
    const data = await load()
    const items = data.items.filter(item => item.published).sort(byOrder).map(publicItem)
    res.set('Cache-Control', 'no-cache')
    res.json({ categories: data.categories.filter(category => items.some(item => item.category === category.id)), items })
  })

  // Liczymy przejścia, nie odwiedzających: jedno kliknięcie z adresu na link co 10 minut.
  const recentVisits = new Map()
  app.post('/api/links/:id/visit', async (req, res) => {
    const key = `${req.ip}|${req.params.id}`
    const now = Date.now()
    if (recentVisits.size > 5000) recentVisits.clear()
    if (now - (recentVisits.get(key) || 0) < 10 * 60 * 1000) return res.status(204).end()
    recentVisits.set(key, now)
    await updateJson(file, null, current => {
      if (!current?.items.some(item => item.id === req.params.id && item.published)) return current
      return { ...current, items: current.items.map(item => (item.id === req.params.id ? { ...item, clicks: (item.clicks || 0) + 1 } : item)) }
    }).catch(() => {})
    res.status(204).end()
  })

  app.get('/api/admin/links', requireAdmin, async (_req, res) => {
    const data = await load()
    res.json({ ...data, items: [...data.items].sort(byOrder), screenshots: Boolean(browserPath()) })
  })

  const fetchError = error => (error.name === 'TimeoutError' || error.name === 'AbortError'
    ? 'Strona nie odpowiedziała w 8 sekund.'
    : error.message?.startsWith('fetch failed') ? 'Nie udało się połączyć ze stroną.' : error.message) || 'Nie udało się odczytać strony.'

  app.post('/api/admin/links/inspect', requireAdmin, enforceSameOrigin, async (req, res) => {
    const url = cleanUrl(req.body?.url)
    if (!url) return res.status(400).json({ error: 'Podaj poprawny adres strony (http lub https).' })
    try {
      const page = await readPage(url)
      const icon = req.body?.icon === false ? '' : await fetchIcon(page.meta, page.url)
      res.json({
        url: cleanUrl(page.url) || url,
        requested: url,
        title: page.meta.title || page.meta.siteName || domainOf(page.url),
        description: page.meta.description,
        siteName: page.meta.siteName,
        icon,
      })
    } catch (error) {
      res.status(422).json({ error: fetchError(error) })
    }
  })

  // Nowy zrzut zapisanego linku – od razu trafia do links.json.
  app.post('/api/admin/links/:id/shot', requireAdmin, enforceSameOrigin, async (req, res) => {
    const item = (await load()).items.find(entry => entry.id === req.params.id)
    if (!item) return res.status(404).json({ error: 'Najpierw zapisz ten link.' })
    if (!browserPath()) return res.status(503).json({ error: 'Na serwerze nie ma przeglądarki do zrzutów (Chromium).' })
    try {
      await assertPublic(item.url)
      const shot = await makeShot(item.url)
      const shotAt = new Date().toISOString()
      await patchItem(item.id, { shot, shotAt, shotFailedAt: undefined })
      res.json({ shot, shotAt })
    } catch (error) {
      res.status(422).json({ error: `Nie udało się zrobić zrzutu: ${fetchError(error)}` })
    }
  })

  app.put('/api/admin/links', requireAdmin, enforceSameOrigin, async (req, res) => {
    const source = req.body || {}
    if (!Array.isArray(source.categories) || !Array.isArray(source.items)) return res.status(400).json({ error: 'Nieprawidłowe dane linków.' })
    if (source.items.length > 2000 || source.categories.length > 100) return res.status(400).json({ error: 'Za dużo pozycji.' })
    const categories = source.categories.map(category => ({ id: slugify(category.id || category.name, ''), name: cleanText(category.name, 80), description: cleanText(category.description, 300) }))
    if (categories.some(category => !category.id || !category.name)) return res.status(400).json({ error: 'Każda kategoria musi mieć nazwę.' })
    if (new Set(categories.map(category => category.id)).size !== categories.length) return res.status(400).json({ error: 'Dwie kategorie mają ten sam identyfikator – zmień nazwę jednej z nich.' })
    const previous = await load()
    const now = new Date().toISOString()
    const items = []
    for (const [index, raw] of source.items.entries()) {
      const url = cleanUrl(raw.url)
      const title = cleanText(raw.title, 200)
      const label = title || `pozycja ${index + 1}`
      if (!url) return res.status(400).json({ error: `Link „${label}” ma niepoprawny adres.` })
      if (!title) return res.status(400).json({ error: `Link pod adresem ${url} nie ma tytułu.` })
      if (!categories.some(category => category.id === raw.category)) return res.status(400).json({ error: `Link „${label}” nie ma kategorii.` })
      const id = /^[\w-]{4,80}$/.test(raw.id || '') ? raw.id : crypto.randomUUID()
      const before = previous.items.find(item => item.id === id)
      const item = {
        id,
        url,
        title,
        description: cleanText(raw.description, 600),
        category: raw.category,
        tags: [...new Set((Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(','))
          .map(tag => cleanText(tag, 40).replace(/^#/, '').toLowerCase()).filter(Boolean))].slice(0, 8),
        icon: cleanIcon(raw.icon),
        featured: raw.featured === true,
        published: raw.published !== false,
        order: index,
        createdAt: before?.createdAt || (Date.parse(raw.createdAt) ? new Date(raw.createdAt).toISOString() : now),
        updatedAt: now,
      }
      // Sama zmiana kolejności nie odświeża daty – „ostatnio zmienione” ma znaczyć treść.
      if (before) {
        const same = ['url', 'title', 'description', 'category', 'icon', 'featured', 'published'].every(key => before[key] === item[key])
          && JSON.stringify(before.tags || []) === JSON.stringify(item.tags)
        item.updatedAt = same ? before.updatedAt || now : now
      }
      items.push(item)
    }
    if (new Set(items.map(item => item.id)).size !== items.length) return res.status(400).json({ error: 'Identyfikatory linków muszą być unikalne.' })
    // Zrzut i licznik należą do serwera; zrzut przepada, gdy zmienił się adres.
    const saved = await updateJson(file, previous, current => ({
      categories,
      items: items.map(item => {
        const stored = current.items.find(entry => entry.id === item.id)
        const keep = stored && stored.url === item.url
        return {
          ...item,
          clicks: stored?.clicks || 0,
          ...(keep && stored.shot ? { shot: stored.shot, shotAt: stored.shotAt } : {}),
          ...(keep && stored.shotFailedAt ? { shotFailedAt: stored.shotFailedAt } : {}),
        }
      }),
    }))
    res.json({ ...saved, screenshots: Boolean(browserPath()) })
    processMissingShots().catch(error => console.warn('[links] kolejka zrzutów:', error.message))
  })
}
