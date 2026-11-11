import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

/**
 * Plakaty aplikacji z repozytoriów. Jeśli repozytorium ma
 * `docs/posters/posters.json` (manifest z scripts/posters/build.mjs), serwer
 * pobiera wymienione w nim obrazy, zapisuje je jako WebP w `uploads/posters`
 * i dokleja na początek galerii pracy. Bez manifestu nic się nie zmienia.
 *
 * Manifest sprawdzamy co 30 minut; obrazy pobieramy na nowo tylko wtedy,
 * gdy zmienił się ich SHA w repozytorium. Błąd zostawia ostatni udany wynik.
 */

const TTL_MS = 30 * 60 * 1000
/** Szerokość kopii plakatu do karuzeli na stronie głównej (ok. 2× szerokości karty). */
const SMALL_WIDTH = 600
const API = 'https://api.github.com'
const MANIFEST = 'docs/posters/posters.json'
const PLATFORMS = ['android', 'ios', 'windows', 'linux', 'macos', 'web']
const PLATFORM_NAMES = { android: 'Android', ios: 'iPhone i iPad', windows: 'Windows', linux: 'Linux', macos: 'macOS', web: 'przeglądarka' }
const PLATFORM_NAMES_EN = { ...PLATFORM_NAMES, ios: 'iPhone and iPad', web: 'web' }

function headers(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    'User-Agent': 'redzikowski-homepage',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const safe = value => String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

export function createPosterService({ cacheFile, uploadDir, readJson, updateJson, getToken }) {
  const inFlight = new Map()
  const dir = path.join(uploadDir, 'posters')

  // ref = gałąź; pusta – domyślna gałąź repozytorium.
  const at = ref => (ref ? `?ref=${encodeURIComponent(ref)}` : '')

  async function contents(repo, file, token, ref = '') {
    const encoded = file.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`${API}/repos/${repo}/contents/${encoded}${at(ref)}`, { headers: headers(token) })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`GitHub odpowiedział kodem ${response.status}.`)
    return response.json()
  }

  async function raw(repo, file, token, ref = '') {
    const encoded = file.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`${API}/repos/${repo}/contents/${encoded}${at(ref)}`, { headers: headers(token, 'application/vnd.github.raw') })
    if (!response.ok) throw new Error(`Nie udało się pobrać ${file} (${response.status}).`)
    return Buffer.from(await response.arrayBuffer())
  }

  async function fetchEntry(repo, slug, cached) {
    const token = await getToken()
    // Część repozytoriów ma domyślną gałąź roboczą (np. dev/…), a plakaty leżą na main.
    let ref = ''
    let meta = await contents(repo, MANIFEST, token)
    if (!meta) {
      meta = await contents(repo, MANIFEST, token, 'main')
      if (meta) ref = 'main'
    }
    if (!meta) return { repo, fetchedAt: new Date().toISOString(), sha: '', items: [], error: '' }
    const manifest = JSON.parse(Buffer.from(meta.content || '', 'base64').toString('utf8'))
    const folder = path.join(dir, safe(slug))
    await fs.mkdir(folder, { recursive: true })
    const previous = new Map((cached?.items || []).map(item => [item.file, item]))
    const items = []
    for (const poster of manifest.posters || []) {
      const platform = PLATFORMS.includes(poster.platform) ? poster.platform : 'other'
      const file = String(poster.file || '').replace(/^\/+/, '')
      if (!file || file.includes('..')) continue
      const repoPath = `docs/posters/${file}`
      const info = await contents(repo, repoPath, token, ref)
      if (!info?.sha) continue
      const known = previous.get(file)
      const name = `${safe(platform)}-${info.sha.slice(0, 10)}.webp`
      const target = path.join(folder, name)
      let size = known?.sha === info.sha ? { width: known.width, height: known.height } : null
      const exists = await fs.stat(target).then(() => true, () => false)
      if (!size || !exists) {
        const image = await raw(repo, repoPath, token, ref)
        const out = await sharp(image).webp({ quality: 88, effort: 5 }).toFile(target)
        size = { width: out.width, height: out.height }
      }
      // Mniejsza kopia do karuzeli na stronie głównej (pełny plakat zostaje w galerii pracy).
      const small = name.replace(/\.webp$/, '-sm.webp')
      const smallPath = path.join(folder, small)
      if (!(await fs.stat(smallPath).then(() => true, () => false))) {
        await sharp(target).resize({ width: SMALL_WIDTH, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(smallPath)
      }
      items.push({
        file,
        sha: info.sha,
        platform,
        src: `/uploads/posters/${safe(slug)}/${name}`,
        thumb: `/uploads/posters/${safe(slug)}/${small}`,
        alt: `${manifest.name || slug} – plakat: ${PLATFORM_NAMES[platform] || platform}`,
        altEn: `${manifest.name || slug} – poster: ${PLATFORM_NAMES_EN[platform] || platform}`,
        ...size,
      })
    }
    // Stare wersje plakatów tej pracy usuwamy, żeby katalog nie puchł.
    const keep = new Set(items.flatMap(item => [path.basename(item.src), path.basename(item.thumb)]))
    for (const name of await fs.readdir(folder).catch(() => [])) {
      if (!keep.has(name)) await fs.rm(path.join(folder, name), { force: true })
    }
    const hash = createHash('sha1').update(items.map(item => item.sha).join(',')).digest('hex').slice(0, 12)
    return { repo, fetchedAt: new Date().toISOString(), sha: hash, items, error: '' }
  }

  async function refresh(repo, slug) {
    const key = `${repo}#${slug}`
    if (inFlight.has(key)) return inFlight.get(key)
    const task = (async () => {
      const cached = (await readJson(cacheFile, {}))[key]
      try {
        const entry = await fetchEntry(repo, slug, cached)
        await updateJson(cacheFile, {}, current => ({ ...current, [key]: entry }))
        return entry
      } catch (error) {
        const failure = { ...(cached || { repo, items: [] }), fetchedAt: new Date().toISOString(), error: error.message }
        await updateJson(cacheFile, {}, current => ({ ...current, [key]: failure }))
        return failure
      } finally {
        inFlight.delete(key)
      }
    })()
    inFlight.set(key, task)
    return task
  }

  /** Plakaty z cache; przedawnione odświeżają się w tle, pierwszy raz – od razu. */
  async function get(repo, slug, { wait = false } = {}) {
    if (!repo || !slug) return []
    const cached = (await readJson(cacheFile, {}))[`${repo}#${slug}`]
    const stale = !cached?.fetchedAt || Date.now() - Date.parse(cached.fetchedAt) > TTL_MS
    if (!cached || wait) return (await refresh(repo, slug)).items || []
    if (stale) refresh(repo, slug).catch(() => undefined)
    return cached.items || []
  }

  /** Same wpisy z cache, bez sieci – dla listy prac. */
  async function cachedMany() {
    return readJson(cacheFile, {})
  }

  return { get, refresh, cachedMany }
}

/** Plakaty jako zrzuty galerii – na początku, w kolejności z manifestu. */
export function withPosters(project, posters) {
  if (!posters?.length) return project
  const shots = posters.map(item => ({ src: item.src, thumb: item.thumb, alt: item.alt, altEn: item.altEn, poster: true, platform: item.platform }))
  const known = new Set(shots.map(shot => shot.src))
  return { ...project, shots: [...shots, ...(project.shots || []).filter(shot => !known.has(shot.src))] }
}
