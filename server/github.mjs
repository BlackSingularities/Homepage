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
// Podbijane, gdy zmienia się kształt wpisu – stare wpisy odświeżają się od razu.
const CACHE_VERSION = 3
// Ile wydań wstecz trzymamy – starczy na historię zmian i na aplikacje, które
// przeglądają listę zamiast samego „latest”.
const HISTORY = 15
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

/** Usuwa z nazwy pliku powtórzenia nazwy projektu i wersji – zostaje sama treść. */
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
    const error = new Error('GitHub odrzucił zapytanie – sprawdź token i jego uprawnienia.')
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

/** Opis wydania bez stopki dopisywanej przez CI (wszystko po linii `---`). */
function releaseNotes(body) {
  return String(body || '').replace(/\r\n/g, '\n').split(/\n---\s*(?:\n|$)/)[0].trim()
}

function mapAsset(asset, tag) {
  return {
    id: String(asset.id),
    name: asset.name || '',
    label: assetLabel(asset.name),
    platform: detectPlatform(asset.name),
    size: Number(asset.size) || 0,
    contentType: asset.content_type || '',
    downloadCount: Number(asset.download_count) || 0,
    version: tag,
    directUrl: asset.browser_download_url || '',
  }
}

const mapRelease = item => ({
  tag: item.tag_name || '',
  name: item.name || item.tag_name || '',
  publishedAt: item.published_at || item.created_at || '',
  prerelease: item.prerelease === true,
  notes: releaseNotes(item.body),
  assets: (item.assets || []).map(asset => mapAsset(asset, item.tag_name || '')),
})

/**
 * Ostatnie wydania jednym zapytaniem. „Aktualne” to pierwsze pełne wydanie,
 * a gdy są same wstępne – najnowsze z nich (tak samo jak wcześniej robiło
 * `releases/latest` z zapasem na listę).
 */
async function fetchEntry(repo, token) {
  const [meta, list] = await Promise.all([
    request(`/repos/${repo}`, token).catch(() => null),
    request(`/repos/${repo}/releases?per_page=${HISTORY}`, token).catch(error => {
      error.repoPrivate = null
      throw error
    }),
  ])
  const published = (Array.isArray(list) ? list : []).filter(item => !item.draft)
  const release = published.find(item => !item.prerelease) || published[0]
  // Gdy GitHub nie pokazał repozytorium, jego widoczność jest nieznana (null)
  // i strona traktuje je jak prywatne.
  const isPrivate = meta ? meta.private === true : null
  if (!release) {
    const empty = new Error('To repozytorium nie ma jeszcze żadnego wydania.')
    empty.status = 404
    empty.repoPrivate = isPrivate
    throw empty
  }
  const current = mapRelease(release)
  return {
    v: CACHE_VERSION,
    repo,
    fetchedAt: new Date().toISOString(),
    private: isPrivate,
    error: '',
    ...current,
    url: release.html_url || `https://github.com/${repo}/releases`,
    history: published.map(mapRelease),
  }
}

/**
 * Odcisk tego, co widać na stronie: wydania i ich pliki. Liczniki pobrań celowo
 * pomijamy – zmieniają się ciągle, a nie są nowym wydaniem.
 */
function releaseSignature(entry) {
  const files = list => (list || []).map(asset => `${asset.id}:${asset.name}:${asset.size}`).join(',')
  return JSON.stringify([
    entry.tag, entry.publishedAt, files(entry.assets),
    (entry.history || []).map(item => `${item.tag}|${item.publishedAt}|${files(item.assets)}`),
  ])
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
          ...(cached || { repo, private: null, tag: '', name: '', publishedAt: '', url: `https://github.com/${repo}/releases`, assets: [] }),
          ...(error.repoPrivate !== undefined && { private: error.repoPrivate }),
          v: CACHE_VERSION,
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

  /**
   * Odświeżenie tylko wtedy, gdy na GitHubie coś się zmieniło: nowe wydanie, inne pliki
   * albo naprawiony wcześniejszy błąd. Niezmienione wpisy w cache zostają nietknięte.
   */
  async function refreshIfChanged(repo) {
    const cached = (await read())[repo]
    if (!cached || cached.v !== CACHE_VERSION || cached.error) {
      const entry = await refresh(repo)
      return { entry, changed: !entry.error, previous: cached?.tag || '' }
    }
    let fresh
    try {
      fresh = await fetchEntry(repo, await getToken())
    } catch (error) {
      // Błąd sprawdzenia nie psuje dobrego wpisu – zostaje stary, a panel dostaje komunikat.
      return { entry: { ...cached, error: error.message }, changed: false, previous: cached.tag }
    }
    const changed = releaseSignature(fresh) !== releaseSignature(cached)
    if (changed) await store(repo, fresh)
    return { entry: changed ? fresh : cached, changed, previous: cached.tag }
  }

  /** Zwraca wynik z cache, a gdy jest przedawniony – odświeża w tle i podaje stary. */
  async function get(repo, { wait = false } = {}) {
    if (!repo) return null
    const cached = (await read())[repo]
    const stale = !cached?.fetchedAt || Date.now() - Date.parse(cached.fetchedAt) > TTL_MS
    if (!stale && cached.v === CACHE_VERSION) return cached
    if (wait || !cached || cached.v !== CACHE_VERSION) return refresh(repo)
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
   * Strumień pliku z wydania – wszystkie pobrania idą przez stronę, także z
 * repozytoriów prywatnych. GitHub odpowiada przekierowaniem do
   * magazynu, do którego nie wolno przesłać nagłówka autoryzacji – dlatego
   * przekierowanie obsługujemy ręcznie.
   */
  async function asset(repo, assetId, { range = '' } = {}) {
    const token = await getToken()
    if (!token) {
      const error = new Error('Pobieranie z repozytorium wymaga tokenu GitHuba w panelu.')
      error.status = 409
      throw error
    }
    const first = await fetch(`${API}/repos/${repo}/releases/assets/${assetId}`, {
      headers: headers(token, 'application/octet-stream'),
      redirect: 'manual',
    })
    const location = first.headers.get('location')
    // Zakres idzie dalej, żeby menedżer pobierania mógł wznowić duży plik.
    const extra = range ? { Range: range } : {}
    const response = location ? await fetch(location, { headers: { 'User-Agent': USER_AGENT, ...extra } }) : first
    if (!response.ok || !response.body) {
      const error = new Error('Nie udało się pobrać pliku z GitHuba.')
      error.status = response.status === 404 ? 404 : 502
      throw error
    }
    return {
      body: response.body,
      status: response.status,
      range: response.headers.get('content-range') || '',
      size: response.headers.get('content-length') || '',
      type: response.headers.get('content-type') || 'application/octet-stream',
    }
  }

  /** Sprawdzenie tokenu dla panelu – zwraca nazwę konta i widoczne zakresy. */
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

  return { get, getMany, refresh, refreshIfChanged, asset, check }
}
