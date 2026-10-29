import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Własna, prosta analityka – bez zewnętrznych skryptów i bez wysyłania danych
 * komukolwiek. Zdarzenia lądują w plikach JSONL (jeden plik na miesiąc), a
 * panel liczy z nich zestawienia na żądanie.
 *
 * Dwa poziomy danych:
 * - bez zgody: tylko anonimowe zdarzenie (strona, typ urządzenia), bez
 *   identyfikatora odwiedzającego i bez odsyłacza – nie da się z tego
 *   odtworzyć ścieżki konkretnej osoby,
 * - ze zgodą: losowy identyfikator odwiedzającego i sesji z przeglądarki,
 *   źródło wejścia, rozdzielczość, język, czas na stronie.
 *
 * Adresów IP nie zapisujemy. Pobrania plików liczymy zawsze – to licznik, nie
 * profil – i trzymamy je osobno, żeby strona mogła je szybko pokazać. Tak samo
 * przejścia do sklepów (Google Play, Microsoft Store, App Store): samej
 * instalacji w sklepie nie widzimy, ale kliknięcie w plakietkę – tak.
 */

const RETENTION_MONTHS = 13
const TYPES = ['pageview', 'download', 'store', 'leave', 'consent', 'event']

const clip = (value, max) => String(value ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, max)
const cleanId = value => (/^[a-z0-9-]{8,64}$/i.test(String(value || '')) ? String(value) : '')

function cleanPath(value) {
  const raw = clip(value, 300)
  if (!raw.startsWith('/')) return '/'
  return raw.split('?')[0].split('#')[0] || '/'
}

function refHost(value, ownHost) {
  try {
    const url = new URL(String(value || ''))
    if (!/^https?:$/.test(url.protocol)) return ''
    const host = url.hostname.replace(/^www\./, '')
    return host === ownHost ? '' : host.slice(0, 120)
  } catch {
    return ''
  }
}

/** Grube rozpoznanie przeglądarki i systemu – wystarczy do wykresu, bez fingerprintu. */
export function parseAgent(agent = '') {
  const ua = String(agent)
  const bot = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch/i.test(ua)
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /Chrome\//.test(ua) ? 'Chrome'
            : /Safari\//.test(ua) ? 'Safari'
              : 'Inna'
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
          : /Linux|X11/.test(ua) ? 'Linux'
            : 'Inny'
  const device = /iPad|Tablet/.test(ua) ? 'tablet' : /Mobi|Android|iPhone/.test(ua) ? 'mobile' : 'desktop'
  return { bot, browser, os, device }
}

const monthKey = date => date.toISOString().slice(0, 7)

export function createAnalytics({ dir, readJson, updateJson, countsFile }) {
  const fileFor = key => path.join(dir, `events-${key}.jsonl`)

  async function prune() {
    const files = await fs.readdir(dir).catch(() => [])
    const limit = new Date()
    limit.setUTCMonth(limit.getUTCMonth() - RETENTION_MONTHS)
    const oldest = monthKey(limit)
    await Promise.all(files
      .filter(name => /^events-\d{4}-\d{2}\.jsonl$/.test(name) && name.slice(7, 14) < oldest)
      .map(name => fs.unlink(path.join(dir, name)).catch(() => undefined)))
  }

  async function init() {
    await fs.mkdir(dir, { recursive: true })
    await prune()
    setInterval(() => prune().catch(() => undefined), 24 * 60 * 60 * 1000).unref()
  }

  /** Zamienia surowe body z przeglądarki na bezpieczny rekord albo `null`. */
  function normalize(body, { agent, host }) {
    const type = TYPES.includes(body?.type) ? body.type : ''
    if (!type) return null
    const { bot, browser, os, device } = parseAgent(agent)
    if (bot) return null
    const consent = body?.consent === true
    const event = {
      t: new Date().toISOString(),
      type,
      path: cleanPath(body?.path),
      device,
      consent,
    }
    if (type === 'consent') event.value = body?.value === 'granted' ? 'granted' : 'denied'
    if (type === 'download') {
      event.project = clip(body?.project, 120)
      event.asset = clip(body?.asset, 60)
      event.platform = clip(body?.platform, 20)
      event.version = clip(body?.version, 40)
    }
    if (type === 'store') {
      event.project = clip(body?.project, 120)
      event.store = ['google', 'microsoft', 'apple'].includes(body?.store) ? body.store : ''
      if (!event.project || !event.store) return null
    }
    if (type === 'event') event.name = clip(body?.name, 60)
    if (consent) {
      event.vid = cleanId(body?.vid)
      event.sid = cleanId(body?.sid)
      event.browser = browser
      event.os = os
      event.lang = clip(body?.lang, 12).toLowerCase()
      event.screen = /^\d{2,5}x\d{2,5}$/.test(String(body?.screen || '')) ? body.screen : ''
      event.ref = refHost(body?.ref, String(host || '').replace(/^www\./, '').split(':')[0])
      const campaign = clip(body?.utm, 80)
      if (campaign) event.utm = campaign
      if (type === 'leave') event.ms = Math.max(0, Math.min(Number(body?.ms) || 0, 2 * 60 * 60 * 1000))
      if (body?.newVisitor === true) event.isNew = true
    }
    return event
  }

  async function record(body, context) {
    const event = normalize(body, context)
    if (!event) return false
    await fs.appendFile(fileFor(monthKey(new Date())), `${JSON.stringify(event)}\n`)
    if (event.type === 'download' && event.project && event.asset) {
      await updateJson(countsFile, {}, current => {
        const key = `${event.project}/${event.asset}`
        return { ...current, [key]: (Number(current[key]) || 0) + 1 }
      })
    }
    if (event.type === 'store') {
      // Osobny przedrostek – suma pobrań z pliku nie może łapać sklepów.
      await updateJson(countsFile, {}, current => {
        const key = `store:${event.project}/${event.store}`
        return { ...current, [key]: (Number(current[key]) || 0) + 1 }
      })
    }
    return true
  }

  /** Lokalny licznik kliknięć w plik – `slug/assetId → liczba`. */
  const counts = () => readJson(countsFile, {})

  async function readRange(from, to) {
    const keys = []
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
    while (cursor <= to) {
      keys.push(monthKey(cursor))
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
    const fromIso = from.toISOString()
    const toIso = to.toISOString()
    const events = []
    for (const key of keys) {
      const text = await fs.readFile(fileFor(key), 'utf8').catch(() => '')
      for (const line of text.split('\n')) {
        if (!line) continue
        try {
          const event = JSON.parse(line)
          if (event.t >= fromIso && event.t <= toIso) events.push(event)
        } catch { /* uszkodzona linia – pomijamy */ }
      }
    }
    return events
  }

  const tally = (items, pick, limit = 10) => {
    const map = new Map()
    for (const item of items) {
      const key = pick(item)
      if (!key) continue
      map.set(key, (map.get(key) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }))
  }

  /**
   * Rozbicie pobrań ze strony: ile razy kliknięto konkretny plik konkretnej
   * wersji. Liczymy z dziennika zdarzeń, więc zostają w nim także wersje,
   * których nie ma już w bieżącym wydaniu.
   */
  const SEP = String.fromCharCode(31)
  const detail = list => {
    const map = new Map()
    for (const event of list) {
      if (!event.project) continue
      const key = [event.project, event.asset || '', event.version || '', event.platform || ''].join(SEP)
      map.set(key, (map.get(key) || 0) + 1)
    }
    return [...map.entries()]
      .map(([key, count]) => {
        const [project, asset, version, platform] = key.split(SEP)
        return { project, asset, version, platform, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 400)
  }

  /** Zestawienie dla panelu: liczby, dzienny wykres, rankingi. */
  async function report({ days = 30 } = {}) {
    const span = Math.max(1, Math.min(Number(days) || 30, 366))
    const to = new Date()
    const from = new Date(to.getTime() - span * 24 * 60 * 60 * 1000)
    const previousFrom = new Date(from.getTime() - span * 24 * 60 * 60 * 1000)
    const all = await readRange(previousFrom, to)
    const fromIso = from.toISOString()
    const events = all.filter(event => event.t >= fromIso)
    const previous = all.filter(event => event.t < fromIso)

    const summarize = list => {
      const views = list.filter(event => event.type === 'pageview')
      const consented = views.filter(event => event.consent && event.vid)
      const sessions = new Map()
      for (const event of consented) {
        if (!event.sid) continue
        sessions.set(event.sid, (sessions.get(event.sid) || 0) + 1)
      }
      const durations = list.filter(event => event.type === 'leave' && event.ms > 0).map(event => event.ms)
      const bounces = [...sessions.values()].filter(count => count === 1).length
      return {
        pageviews: views.length,
        visitors: new Set(consented.map(event => event.vid)).size,
        newVisitors: new Set(list.filter(event => event.isNew && event.vid).map(event => event.vid)).size,
        sessions: sessions.size,
        pagesPerSession: sessions.size ? +(consented.length / sessions.size).toFixed(2) : 0,
        bounceRate: sessions.size ? Math.round((bounces / sessions.size) * 100) : 0,
        avgTimeMs: durations.length ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length) : 0,
        downloads: list.filter(event => event.type === 'download').length,
        stores: list.filter(event => event.type === 'store').length,
      }
    }

    const series = []
    const byDay = new Map()
    for (const event of events) {
      const day = event.t.slice(0, 10)
      const bucket = byDay.get(day) || { views: 0, visitors: new Set(), downloads: 0, stores: 0 }
      if (event.type === 'pageview') {
        bucket.views += 1
        if (event.vid) bucket.visitors.add(event.vid)
      }
      if (event.type === 'download') bucket.downloads += 1
      if (event.type === 'store') bucket.stores += 1
      byDay.set(day, bucket)
    }
    for (let index = span - 1; index >= 0; index -= 1) {
      const day = new Date(to.getTime() - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const bucket = byDay.get(day)
      series.push({ day, views: bucket?.views || 0, visitors: bucket?.visitors.size || 0, downloads: bucket?.downloads || 0, stores: bucket?.stores || 0 })
    }

    const hours = Array.from({ length: 24 }, () => 0)
    const views = events.filter(event => event.type === 'pageview')
    for (const event of views) hours[new Date(event.t).getHours()] += 1
    const rich = views.filter(event => event.consent)
    const downloads = events.filter(event => event.type === 'download')
    const storeClicks = events.filter(event => event.type === 'store')
    const consentEvents = events.filter(event => event.type === 'consent')

    return {
      days: span,
      totals: summarize(events),
      previous: summarize(previous),
      series,
      hours,
      pages: tally(views, event => event.path, 15),
      referrers: tally(rich, event => event.ref || '(bezpośrednio)', 12),
      campaigns: tally(rich, event => event.utm, 10),
      devices: tally(views, event => event.device, 5),
      browsers: tally(rich, event => event.browser, 8),
      systems: tally(rich, event => event.os, 8),
      languages: tally(rich, event => event.lang, 8),
      screens: tally(rich, event => event.screen, 8),
      downloadsByProject: tally(downloads, event => event.project, 20),
      downloadsDetail: detail(downloads),
      downloadsByPlatform: tally(downloads, event => event.platform, 8),
      storesByProject: tally(storeClicks, event => event.project, 20),
      storesByStore: tally(storeClicks, event => event.store, 3),
      storesDetail: tally(storeClicks, event => `${event.project}/${event.store}`, 200),
      consent: {
        granted: consentEvents.filter(event => event.value === 'granted').length,
        denied: consentEvents.filter(event => event.value === 'denied').length,
        share: views.length ? Math.round((rich.length / views.length) * 100) : 0,
      },
    }
  }

  return { init, record, counts, report }
}
