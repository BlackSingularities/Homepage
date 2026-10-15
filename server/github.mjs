import { detectPlatform } from './projects.mjs'

/**
 * Najnowsze wydania z GitHuba. Token jest opcjonalny: bez niego czytamy tylko
 * repozytoria publiczne, z nim także prywatne (pliki z prywatnych repo lecą
 * wtedy przez proxy serwera, bo `browser_download_url` wymaga nagłówka).
 *
 * Odpowiedzi trzymamy w pliku cache z czasem życia, żeby strona nie odpytywała
 * GitHuba przy każdym wejściu i nie wpadała w limit zapytań. Gdy odświeżenie
 * padnie, zwracamy ostatni udany wynik razem z informacją o błędzie.
 */

const TTL_MS = 30 * 60 * 1000
const API = 'https://api.github.com'
const USER_AGENT = 'redzikowski-homepage'

function headers(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Usuwa z nazwy pliku powtórzenia nazwy projektu i wersji — zostaje sama treść. */
function assetLabel(name) {
  const base = String(name || '').replace(/\.[a-z0-9]{1,8}$/i, '')
  const extension = String(name || '').match(/\.([a-z0-9]{1,8})$/i)?.[1] || ''
  const parts = base.split(/[-_.]/).filter(part => part && !/^v?\d+(\.\d+)*$/i.test(part))
  const tail = parts.slice(1).join(' ')
  return extension ? `.${extension.toLowerCase()}${tail ? ` · ${tail}` : ''}` : base
}

async function request(path, token, accept) {
  const response = await fetch(`${API}${path}`, { headers: headers(token, accept) })
  if (response.status === 404) {
    const error = new Error('Repozytorium lub wydanie nie istnieje, albo token nie ma do niego dostępu.')
    error.status = 404
    throw error
  }
  if (response.status === 401 || response.status === 403) {
    const error = new Error('GitHub odrzucił zapytanie — sprawdź token i jego uprawnienia.')
    error.status = response.status
    throw error
  }
  if (!response.ok) {
    const error = new Error(`GitHub odpowiedział kodem ${response.status}.`)
    error.status = response.status
    throw error
  }
  return response.json()
}

/** Najpierw oficjalne „latest”, a gdy go nie ma — najnowsze wydanie z listy (także wersje wstępne). */
async function fetchRelease(repo, token) {
  try {
    return await request(`/repos/${repo}/releases/latest`, token)
  } catch (error) {
    if (error.status !== 404) throw error
    const list = await request(`/repos/${repo}/releases?per_page=1`, token)
    if (!Array.isArray(list) || !list.length) {
      const empty = new Error('To repozytorium nie ma jeszcze żadnego wydania.')
      empty.status = 404
      throw empty
    }
    return list[0]
  }
}

async function fetchEntry(repo, token) {
  const [meta, release] = await Promise.all([
    request(`/repos/${repo}`, token).catch(() => null),
    fetchRelease(repo, token),
  ])
  return {
    repo,
    fetchedAt: new Date().toISOString(),
    private: meta?.private === true,
    error: '',
    tag: release.tag_name || '',
    name: release.name || release.tag_name || '',
    publishedAt: release.published_at || release.created_at || '',
    url: release.html_url || `https://github.com/${repo}/releases`,
    assets: (release.assets || []).map(asset => ({
      id: String(asset.id),
      name: asset.name || '',
      label: assetLabel(asset.name),
      platform: detectPlatform(asset.name),
      size: Number(asset.size) || 0,
      version: release.tag_name || '',
      directUrl: asset.browser_download_url || '',
    })),
  }
}

export function createReleaseService({ cacheFile, readJson, updateJson, getToken }) {
  const inFlight = new Map()

  const read = () => readJson(cacheFile, {})

  const store = (repo, entry) => updateJson(cacheFile, {}, current => ({ ...current, [repo]: entry }))

  async function refresh(repo) {
    if (inFlight.has(repo)) return inFlight.get(repo)
    const task = (async () => {
      const token = await getToken()
      try {
        const entry = await fetchEntry(repo, token)
        await store(repo, entry)
        return entry
      } catch (error) {
        const cached = (await read())[repo]
        const failure = {
          ...(cached || { repo, private: false, tag: '', name: '', publishedAt: '', url: `https://github.com/${repo}/releases`, assets: [] }),
          checkedAt: new Date().toISOString(),
          error: error.message,
        }
        await store(repo, failure)
        return failure
      } finally {
        inFlight.delete(repo)
      }
    })()
    inFlight.set(repo, task)
    return task
  }

  /** Zwraca wynik z cache, a gdy jest przedawniony — odświeża w tle i podaje stary. */
  async function get(repo, { wait = false } = {}) {
    if (!repo) return null
    const cached = (await read())[repo]
    const stale = !cached?.fetchedAt || Date.now() - Date.parse(cached.fetchedAt) > TTL_MS
    if (!stale) return cached
    if (wait || !cached) return refresh(repo)
    refresh(repo).catch(() => undefined)
    return cached
  }

  /** Mapa `repo → wydanie` dla listy projektów, jednym przebiegiem po cache. */
  async function getMany(repos) {
    const unique = [...new Set(repos.filter(Boolean))]
    const entries = await Promise.all(unique.map(async repo => [repo, await get(repo)]))
    return Object.fromEntries(entries)
  }

  /**
   * Strumień pliku z prywatnego wydania. GitHub odpowiada przekierowaniem do
   * magazynu, do którego nie wolno przesłać nagłówka autoryzacji — dlatego
   * przekierowanie obsługujemy ręcznie.
   */
  async function asset(repo, assetId) {
    const token = await getToken()
    if (!token) {
      const error = new Error('Pobieranie z prywatnego repozytorium wymaga tokenu GitHuba w panelu.')
      error.status = 409
      throw error
    }
    const first = await fetch(`${API}/repos/${repo}/releases/assets/${assetId}`, {
      headers: headers(token, 'application/octet-stream'),
      redirect: 'manual',
    })
    const location = first.headers.get('location')
    const response = location ? await fetch(location, { headers: { 'User-Agent': USER_AGENT } }) : first
    if (!response.ok || !response.body) {
      const error = new Error('Nie udało się pobrać pliku z GitHuba.')
      error.status = response.status === 404 ? 404 : 502
      throw error
    }
    return {
      body: response.body,
      size: response.headers.get('content-length') || '',
      type: response.headers.get('content-type') || 'application/octet-stream',
    }
  }

  /** Sprawdzenie tokenu dla panelu — zwraca nazwę konta i widoczne zakresy. */
  async function check() {
    const token = await getToken()
    if (!token) return { configured: false }
    const response = await fetch(`${API}/user`, { headers: headers(token) })
    if (!response.ok) {
      return { configured: true, ok: false, error: `GitHub odpowiedział kodem ${response.status}.` }
    }
    const user = await response.json()
    return { configured: true, ok: true, login: user.login || '' }
  }

  return { get, getMany, refresh, asset, check }
}
