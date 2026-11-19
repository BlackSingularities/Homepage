import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { cors } from './app-accounts.mjs'

/**
 * Dane okolicy GRANI trzymane na serwerze: odpowiedzi Overpass (szlaki, punkty, granice, zamknięcia,
 * pokrycie terenu) dla sektorów nad Polską, Czechami i Słowacją.
 *
 * Aplikacja pyta najpierw tutaj (`POST /api/gran/overpass` z treścią zapytania). Gdy zapytanie
 * dotyczy obszaru z listy, a odpowiedź jest w pamięci – dostaje ją od razu (skompresowaną).
 * Gdy jej jeszcze nie ma – serwer dopisuje zapytanie do kolejki (202), a aplikacja pyta publiczny
 * Overpass jak dotąd. Poza obszarem – 404, aplikacja pyta publiczny Overpass.
 *
 * Kolejka pracuje po jednym zapytaniu naraz, z przerwami (uczciwe korzystanie z publicznych
 * serwerów). Raz na godzinę dopisuje do niej brakujące i przeterminowane (> 30 dni) zapytania
 * wszystkich sektorów obszaru – na podstawie tych samych szablonów co w aplikacji
 * (`gran-queries.json`, wyciągnięte z `osm.rs` i `landcover.rs`; po zmianie zapytań w GRANI
 * zaktualizuj plik – bez tego serwer i tak uczy się nowych zapytań od aplikacji).
 */

const gzip = promisify(zlib.gzip)
const QUERIES = JSON.parse(await fs.readFile(new URL('./gran-queries.json', import.meta.url), 'utf8'))

/** Obszar trzymany na serwerze: prostokąty krajów (zachód, południe, wschód, północ), bez Alp. */
export const REGIONS = {
  pl: { name: 'Polska', box: [14.07, 49.0, 24.16, 54.84] },
  cz: { name: 'Czechy', box: [12.09, 48.55, 18.86, 51.06] },
  sk: { name: 'Słowacja', box: [16.83, 47.73, 22.57, 49.61] },
}
const SECTOR_Z = 9
const FRESH = 30 * 24 * 60 * 60 * 1000
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const PAUSE = 4000
const RETRY = 10 * 60 * 1000
const LIMIT_WINDOW = 15 * 60 * 1000
const LIMIT = 600

const n = 1 << SECTOR_Z
const xToLon = x => x * 360 - 180
const yToLat = y => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI
const lonToX = lon => (lon + 180) / 360
const latToY = lat => {
  const r = (lat * Math.PI) / 180
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2
}
const f6 = v => v.toFixed(6)

/** Prostokąt sektora z9 – tak samo jak `TileId::bbox` w GRANI. */
function sectorBox(x, y) {
  return { w: xToLon(x / n), e: xToLon((x + 1) / n), n: yToLat(y / n), s: yToLat((y + 1) / n) }
}

export function inRegion(lon, lat) {
  return Object.values(REGIONS).some(({ box: [w, s, e, nn] }) => lon >= w && lon <= e && lat >= s && lat <= nn)
}

/** Sektory przecinające obszar. */
export function regionSectors() {
  const set = new Map()
  for (const { box: [w, s, e, nn] } of Object.values(REGIONS)) {
    const [x0, x1] = [Math.floor(lonToX(w) * n), Math.floor(lonToX(e) * n)]
    const [y0, y1] = [Math.floor(latToY(nn) * n), Math.floor(latToY(s) * n)]
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set.set(`${x}_${y}`, { x, y })
  }
  return [...set.values()]
}

/**
 * Góry pobierane najpierw, w tej kolejności (zachód, południe, wschód, północ): Tatry, potem polskie
 * pasma. Reszta obszaru po nich – od najbliższych Tatrom.
 */
const FIRST = [
  [19.6, 49.1, 20.4, 49.35], // Tatry
  [19.9, 49.3, 20.9, 49.65], // Podhale, Pieniny, Gorce
  [18.7, 49.4, 19.95, 49.85], // Beskid Śląski, Żywiecki, Mały, Makowski
  [20.4, 49.3, 21.6, 49.75], // Beskid Sądecki, Wyspowy, Niski (zachód)
  [21.6, 49.0, 22.95, 49.6], // Beskid Niski (wschód), Bieszczady
  [15.4, 50.65, 16.1, 50.95], // Karkonosze, Góry Izerskie
  [15.9, 50.1, 17.4, 50.75], // Sudety Środkowe i Wschodnie
]
const TATRY = [19.95, 49.22]

/** Sektory obszaru w kolejności pobierania: pasma z `FIRST`, potem reszta od najbliższych Tatrom. */
export function sectorsByPriority() {
  const center = ({ x, y }) => [xToLon((x + 0.5) / n), yToLat((y + 0.5) / n)]
  const rank = s => {
    const b = sectorBox(s.x, s.y)
    const i = FIRST.findIndex(([w, so, e, nn]) => b.w < e && b.e > w && b.s < nn && b.n > so)
    if (i >= 0) return i
    const [lon, lat] = center(s)
    return FIRST.length + Math.hypot((lon - TATRY[0]) * Math.cos((lat * Math.PI) / 180), lat - TATRY[1])
  }
  return regionSectors()
    .map(s => ({ ...s, first: rank(s) < FIRST.length, r: rank(s) }))
    .sort((a, b) => a.r - b.r)
}

/** Zapytania aplikacji dla sektora (te same teksty co w GRANI). */
export function sectorQueries(x, y) {
  const b = sectorBox(x, y)
  const bbOf = r => `${f6(r.s)},${f6(r.w)},${f6(r.n)},${f6(r.e)}`
  const bb = bbOf(b)
  const out = []
  // szlaki w ćwiartkach (trails_by_quarters)
  const mx = (b.w + b.e) / 2
  const my = (b.s + b.n) / 2
  for (const [w, s, e, nn] of [[b.w, b.s, mx, my], [mx, b.s, b.e, my], [b.w, my, mx, b.n], [mx, my, b.e, b.n]]) {
    out.push({ kind: 'trails', query: QUERIES.trails.replaceAll('{bb}', bbOf({ w, s, e, n: nn })) })
  }
  out.push({ kind: 'points', query: QUERIES.points.replaceAll('{bb}', bb) })
  out.push({ kind: 'bounds', query: QUERIES.bounds.replaceAll('{bb}', bb) })
  out.push({ kind: 'ways', query: QUERIES.ways.replaceAll('{bb}', bb) })
  // pokrycie terenu w ćwiartkach (landcover::fetch)
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const part = {
        w: b.w + ((b.e - b.w) * i) / 2,
        s: b.s + ((b.n - b.s) * j) / 2,
        e: b.w + ((b.e - b.w) * (i + 1)) / 2,
        n: b.s + ((b.n - b.s) * (j + 1)) / 2,
      }
      out.push({ kind: 'land', query: QUERIES.land.replaceAll('{qb}', bbOf(part)).replaceAll('{bb}', bb) })
    }
  }
  return out
}

/** Środek pierwszego prostokątu `(s,w,n,e)` w zapytaniu. */
function queryCenter(query) {
  const m = /\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/.exec(query)
  if (!m) return null
  const [s, w, nn, e] = m.slice(1, 5).map(Number)
  return { lon: (w + e) / 2, lat: (s + nn) / 2 }
}

const hashOf = query => crypto.createHash('sha256').update(query).digest('hex').slice(0, 32)

export function registerGranSectors(app, deps) {
  const { dataDir, readJson, updateJson, requireAdmin, rateLimits } = deps
  // pamięć podręczna, nie dane: osobny wolumen poza katalogiem danych strony (ten trafia do kopii
  // zapasowych – policzonych odpowiedzi Overpass nie ma sensu kopiować, serwer pobierze je od nowa)
  const ROOT = process.env.GRAN_CACHE_DIR || path.join(dataDir, 'cache')
  const DIR = path.join(ROOT, 'gran-overpass')
  const INDEX = path.join(ROOT, 'gran-overpass.json')
  // pierwsza wersja trzymała pamięć w katalogu danych – sprzątanie
  if (process.env.GRAN_CACHE_DIR) {
    fs.rm(path.join(dataDir, 'gran-overpass'), { recursive: true, force: true }).catch(() => undefined)
    fs.rm(path.join(dataDir, 'gran-overpass.json'), { force: true }).catch(() => undefined)
  }
  // pytania z aplikacji mają pierwszeństwo przed planowym zapełnianiem obszaru
  const urgent = new Map()
  const queue = new Map()
  const failedAt = new Map()
  const stats = { served: 0, queued: 0, outside: 0, fetched: 0, failed: 0, lastError: '', lastAt: null, busy: false }
  const jsonBody = express.json({ limit: '64kb', type: () => true })

  function limited(req) {
    const key = `gran-overpass:${crypto.createHash('sha256').update(`ip:${req.ip}`).digest('hex').slice(0, 20)}`
    const now = Date.now()
    const recent = (rateLimits.get(key) || []).filter(at => now - at < LIMIT_WINDOW)
    if (recent.length >= LIMIT) return true
    recent.push(now)
    rateLimits.set(key, recent)
    return false
  }

  function enqueue(hash, entry, first = false) {
    if (urgent.has(hash) || (!first && queue.has(hash))) return
    const failed = failedAt.get(hash)
    if (failed && Date.now() - failed < RETRY) return
    if (first) {
      queue.delete(hash)
      urgent.set(hash, entry)
    } else {
      queue.set(hash, entry)
    }
    stats.queued = urgent.size + queue.size
  }

  async function upstream(query) {
    let last = ''
    for (const url of OVERPASS) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'GRAN data cache (redzikowski.com)' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(300_000),
        })
        if (!response.ok) {
          last = `${url}: ${response.status}`
          continue
        }
        const text = await response.text()
        const v = JSON.parse(text)
        // przekroczony czas lub limit to kod 200 z uwagą i uciętymi danymi – nie wolno ich zapisać
        if (typeof v.remark === 'string' && v.remark.includes('error')) {
          last = `${url}: ${v.remark.slice(0, 200)}`
          continue
        }
        return text
      } catch (error) {
        last = `${url}: ${error.message}`
      }
    }
    throw new Error(last || 'Overpass nie odpowiada')
  }

  /** Kolejka: po jednym zapytaniu, z przerwą. */
  async function work() {
    await fs.mkdir(DIR, { recursive: true })
    if (!(await fs.stat(INDEX).catch(() => null))) await fs.writeFile(INDEX, '{}')
    for (;;) {
      const next = urgent.entries().next().value || queue.entries().next().value
      if (!next) {
        stats.busy = false
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
      const [hash, entry] = next
      stats.busy = true
      try {
        const text = await upstream(entry.query)
        const packed = await gzip(Buffer.from(text))
        await fs.writeFile(path.join(DIR, `${hash}.json.gz`), packed)
        await updateJson(INDEX, {}, current => ({
          ...current,
          [hash]: { kind: entry.kind, sector: entry.sector || '', query: entry.query, at: new Date().toISOString(), size: packed.length },
        }))
        failedAt.delete(hash)
        stats.fetched += 1
        stats.lastAt = new Date().toISOString()
      } catch (error) {
        failedAt.set(hash, Date.now())
        stats.failed += 1
        stats.lastError = String(error.message).slice(0, 300)
        console.warn('gran-overpass:', stats.lastError)
      }
      urgent.delete(hash)
      queue.delete(hash)
      stats.queued = urgent.size + queue.size
      await new Promise(resolve => setTimeout(resolve, PAUSE))
    }
  }

  /** Brakujące i przeterminowane zapytania wszystkich sektorów obszaru. */
  async function plan() {
    const index = await readJson(INDEX, {})
    // najpierw Tatry i polskie góry (wszystko, z pokryciem terenu), potem szlaki, punkty, granice
    // i zamknięcia reszty obszaru od najbliższych Tatrom, na końcu jej cięższe pokrycie terenu
    const sectors = sectorsByPriority()
    for (const [first, land] of [[true, false], [true, true], [false, false], [false, true]]) {
      for (const { x, y } of sectors.filter(s => s.first === first)) {
        for (const q of sectorQueries(x, y)) {
          if ((q.kind === 'land') !== land) continue
          const hash = hashOf(q.query)
          const known = index[hash]
          if (!known || Date.now() - Date.parse(known.at) > FRESH) enqueue(hash, { ...q, sector: `${x}_${y}` })
        }
      }
    }
  }

  setTimeout(() => {
    work().catch(error => console.error('gran-overpass worker:', error))
    plan().catch(error => console.error('gran-overpass plan:', error))
    setInterval(() => plan().catch(() => undefined), 60 * 60 * 1000)
  }, 15_000)

  app.options('/api/gran/overpass', cors, (_req, res) => res.sendStatus(204))

  app.post('/api/gran/overpass', cors, jsonBody, async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query : ''
    if (!query.startsWith('[out:json]') || query.length > 8000) return res.status(400).json({ error: 'Niepoprawne zapytanie.' })
    const center = queryCenter(query)
    if (!center || !inRegion(center.lon, center.lat)) {
      stats.outside += 1
      return res.status(404).json({ code: 'outside' })
    }
    if (limited(req)) return res.status(429).json({ error: 'Za dużo zapytań – spróbuj później.' })
    const hash = hashOf(query)
    const file = path.join(DIR, `${hash}.json.gz`)
    const stat = await fs.stat(file).catch(() => null)
    if (!stat) {
      enqueue(hash, { kind: 'app', query }, true)
      return res.status(202).json({ code: 'queued' })
    }
    if (Date.now() - stat.mtimeMs > FRESH) enqueue(hash, { kind: 'app', query })
    stats.served += 1
    res.set('Content-Type', 'application/json; charset=utf-8')
    res.set('Content-Encoding', 'gzip')
    res.set('Cache-Control', 'no-store')
    res.sendFile(file)
  })

  /** Panel: postęp i rozmiar danych na serwerze. */
  app.get('/api/admin/gran-sectors', requireAdmin, async (_req, res) => {
    const index = await readJson(INDEX, {})
    const sectors = regionSectors()
    const planned = sectors.length * sectorQueries(sectors[0].x, sectors[0].y).length
    const entries = Object.values(index)
    const fresh = entries.filter(entry => Date.now() - Date.parse(entry.at) <= FRESH)
    res.json({
      regions: Object.values(REGIONS).map(r => r.name),
      sectors: sectors.length,
      planned,
      stored: entries.length,
      fresh: fresh.length,
      bytes: entries.reduce((sum, entry) => sum + (entry.size || 0), 0),
      ...stats,
    })
  })
}
