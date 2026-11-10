import crypto from 'node:crypto'
import { cleanLink, cleanMedia, cleanRepo, cleanText, slugify } from './sanitize.mjs'
import { sanitizeProjectTranslation } from './i18n.mjs'

/**
 * Model realizacji. Dwa rodzaje treści:
 *
 * - `web` – strona lub serwis, którego dowodem jest działający adres,
 * - `app` – aplikacja do pobrania, opcjonalnie z własną stroną.
 *
 * Aplikacja może brać listę plików z najnowszego wydania na GitHubie
 * (`releaseSource: 'github'`) albo z ręcznie wpisanych pozycji (`'manual'`).
 */

export const KINDS = ['web', 'app']
export const RELEASE_SOURCES = ['github', 'manual', 'none']

/** Kolejność wyświetlania plików do pobrania – od najczęściej używanej platformy. */
export const PLATFORMS = [
  ['windows', 'Windows'],
  ['macos', 'macOS'],
  ['linux', 'Linux'],
  ['android', 'Android'],
  ['ios', 'iOS'],
  ['other', 'Inny plik'],
]

/**
 * Sklepy z aplikacjami. Gdy aplikacja ma choć jeden link do sklepu, strona
 * pokazuje plakietki sklepów zamiast plików do pobrania. Platforma służy liście
 * w portfolio – ikonki systemów wynikają wtedy ze sklepów.
 */
export const STORES = [
  ['google', 'Google Play', 'android'],
  ['microsoft', 'Microsoft Store', 'windows'],
  ['apple', 'App Store', 'ios'],
]
export const STORE_IDS = STORES.map(([id]) => id)

function sanitizeStores(input) {
  const result = {}
  for (const id of STORE_IDS) {
    const url = cleanLink(input?.[id])
    if (/^https:\/\//i.test(url)) result[id] = url
  }
  return result
}

/** Linki do sklepów w stałej kolejności – pusta lista, gdy żadnego nie ma. */
export function storesFor(project) {
  if (project.kind !== 'app') return []
  return STORES
    .filter(([id]) => project.stores?.[id])
    .map(([id, name, platform]) => ({ id, name, platform, url: project.stores[id] }))
}

const PLATFORM_IDS = PLATFORMS.map(([id]) => id)
const PLATFORM_ORDER = new Map(PLATFORM_IDS.map((id, index) => [id, index]))

const PLATFORM_PATTERNS = [
  ['android', /\.(apk|aab)$/i],
  ['ios', /\.ipa$/i],
  ['windows', /\.(exe|msi|msix|appx)$/i],
  ['macos', /\.(dmg|pkg)$/i],
  ['linux', /\.(appimage|deb|rpm|snap|flatpak)$/i],
  ['windows', /(^|[-_.])(win|win32|win64|windows)([-_.]|$)/i],
  ['macos', /(^|[-_.])(mac|macos|osx|darwin|apple)([-_.]|$)/i],
  ['linux', /(^|[-_.])(linux|ubuntu|debian|fedora)([-_.]|$)/i],
]

/** Rozpoznaje platformę po nazwie pliku wydania; rozszerzenie wygrywa z nazwą. */
export function detectPlatform(filename) {
  const name = String(filename || '')
  for (const [platform, pattern] of PLATFORM_PATTERNS) {
    if (pattern.test(name)) return platform
  }
  return 'other'
}

export function sortByPlatform(a, b) {
  return (PLATFORM_ORDER.get(a.platform) ?? 99) - (PLATFORM_ORDER.get(b.platform) ?? 99)
}

function cleanPlatform(value) {
  return PLATFORM_IDS.includes(value) ? value : 'other'
}

function sanitizeDownload(input) {
  return {
    id: cleanText(input?.id, 60) || crypto.randomUUID(),
    platform: cleanPlatform(input?.platform),
    label: cleanText(input?.label, 120),
    version: cleanText(input?.version, 40),
    size: Number.isFinite(Number(input?.size)) && Number(input.size) > 0 ? Number(input.size) : 0,
    url: cleanLink(input?.url),
  }
}

function sanitizeShot(input) {
  return { src: cleanMedia(input?.src), alt: cleanText(input?.alt, 200) }
}

/** Platformy, na które można zapisać się do testów. */
export const TEST_PLATFORMS = ['android', 'ios', 'windows', 'macos', 'linux']

export function sanitizeProject(input, existing = {}) {
  const name = cleanText(input?.name, 180) || existing.name || 'Nowa realizacja'
  const kind = KINDS.includes(input?.kind) ? input.kind : 'web'
  const releaseSource = RELEASE_SOURCES.includes(input?.releaseSource) ? input.releaseSource : 'none'
  return {
    id: existing.id || crypto.randomUUID(),
    slug: slugify(input?.slug || name, 'realizacja'),
    name,
    kind,
    label: cleanText(input?.label, 120),
    tagline: cleanText(input?.tagline, 300),
    summary: cleanText(input?.summary, 1200),
    body: cleanText(input?.body, 14000),
    role: cleanText(input?.role, 300),
    stack: (Array.isArray(input?.stack) ? input.stack : [])
      .slice(0, 20).map(item => cleanText(item, 60)).filter(Boolean),
    features: (Array.isArray(input?.features) ? input.features : [])
      .slice(0, 20).map(item => cleanText(item, 200)).filter(Boolean),
    icon: cleanMedia(input?.icon),
    cover: cleanMedia(input?.cover),
    shots: (Array.isArray(input?.shots) ? input.shots : [])
      .slice(0, 24).map(sanitizeShot).filter(shot => shot.src),
    siteUrl: cleanLink(input?.siteUrl),
    siteHidden: input?.siteHidden === true,
    repo: cleanRepo(input?.repo),
    repoHidden: input?.repoHidden !== false,
    releaseSource: kind === 'app' ? releaseSource : 'none',
    stores: kind === 'app' ? sanitizeStores(input?.stores) : {},
    testing: {
      enabled: kind === 'app' && input?.testing?.enabled === true,
      platforms: TEST_PLATFORMS.filter(platform => input?.testing?.platforms?.includes?.(platform)),
    },
    downloads: (Array.isArray(input?.downloads) ? input.downloads : [])
      .slice(0, 12).map(sanitizeDownload).filter(item => item.url),
    en: sanitizeProjectTranslation(input?.en),
    published: input?.published !== false,
    featured: input?.featured === true,
    order: Number.isFinite(Number(input?.order)) ? Number(input.order) : 0,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Miniatura obrazka z panelu: przycięta do 16:10 kopia w WebP, którą serwer
 * generuje przy pierwszym żądaniu (`/uploads/thumbs/…`). Pliki spoza uploadów
 * leżą w statycznym buildzie, więc dla nich zostaje oryginał.
 */
export function thumbFor(src) {
  if (!src || !src.startsWith('/uploads/') || src.startsWith('/uploads/thumbs/') || /\.gif$/i.test(src)) return src || ''
  return `/uploads/thumbs/${src.slice('/uploads/'.length)}.webp`
}

/** Wiersz listy na stronie głównej i w portfolio – bez pełnego opisu i galerii. */
export function projectSummary(project, release, counts = {}) {
  // Bez okładki lista dostaje pierwszy zrzut ekranu – kafelek nie stoi pusty.
  const cover = project.cover || project.shots[0]?.src || ''
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    kind: project.kind,
    label: project.label,
    tagline: project.tagline,
    icon: project.icon || '',
    cover,
    thumb: thumbFor(cover),
    featured: project.featured,
    site: project.siteHidden ? '' : project.siteUrl,
    platforms: [...new Set((storesFor(project).length ? storesFor(project) : downloadsFor(project, release)).map(item => item.platform))]
      .sort((a, b) => (PLATFORM_ORDER.get(a) ?? 99) - (PLATFORM_ORDER.get(b) ?? 99)),
    shots: project.shots.length,
    stores: storesFor(project).map(store => store.id),
    downloadCount: storesFor(project).length ? 0 : allReleasesDownloads(project, release, counts),
  }
}

/**
 * Łączy ręczne pozycje z plikami wydania – zależnie od wybranego źródła.
 * Pliki z wydań zawsze idą przez proxy serwera: repozytoria są prywatne,
 * a pobieranie ma się odbywać wyłącznie przez portfolio.
 */
/** Sumy kontrolne i podpisy zostają w wydaniu dla aktualizatorów, na stronie to szum. */
export const isSupportFile = name => /(\.(sha256|sha512|sig|asc)|sha\d*sums\.txt)$/i.test(name || '')

export function downloadsFor(project, release, counts = {}) {
  if (project.kind !== 'app') return []
  const local = id => Number(counts[`${project.slug}/${id}`]) || 0
  if (project.releaseSource === 'manual') {
    return project.downloads.map(item => ({ ...item, count: local(item.id) })).sort(sortByPlatform)
  }
  if (project.releaseSource !== 'github' || !release) return []
  return (release.assets || [])
    .filter(asset => !isSupportFile(asset.name))
    .map(asset => ({
      id: asset.id,
      platform: asset.platform,
      label: asset.label,
      version: asset.version,
      size: asset.size,
      // GitHub liczy każde pobranie (także te spoza strony); proxy prywatnych
      // wydań też przechodzi przez GitHuba, więc lokalny licznik to tylko zapas.
      count: Math.max(Number(asset.downloadCount) || 0, local(asset.id)),
      url: `/api/projects/${project.slug}/asset/${asset.id}`,
    }))
    .sort(sortByPlatform)
}

export const totalDownloads = downloads => downloads.reduce((sum, item) => sum + (Number(item.count) || 0), 0)

/**
 * Suma pobrań aplikacji ze wszystkich jej wydań na GitHubie, nie tylko
 * z najnowszego. Liczbę z GitHuba wylicza serwis wydań (do 100 wydań wstecz);
 * starszy wpis cache bez niej liczy się z trzymanej historii. Lokalny licznik
 * dokłada tylko to, czego GitHub przy bieżących plikach jeszcze nie widzi.
 */
function allReleasesDownloads(project, release, counts) {
  const current = downloadsFor(project, release, counts)
  if (project.releaseSource !== 'github' || !release) return totalDownloads(current)
  const fromGithub = Number.isFinite(release.downloadTotal)
    ? release.downloadTotal
    : (release.history?.length ? release.history : [release])
      .flatMap(item => item.assets || [])
      .filter(asset => !isSupportFile(asset.name))
      .reduce((sum, asset) => sum + (Number(asset.downloadCount) || 0), 0)
  const githubCurrent = new Map((release.assets || []).map(asset => [asset.id, Number(asset.downloadCount) || 0]))
  const localExtra = current.reduce((sum, item) => sum + Math.max(0, item.count - (githubCurrent.get(item.id) || 0)), 0)
  return fromGithub + localExtra
}

export function publicProject(project, release, counts = {}, { changelog = false } = {}) {
  // Sklep zastępuje pliki: kto wystawił aplikację w sklepie, ten nie chce,
  // żeby obok wisiał instalator z GitHuba.
  const stores = storesFor(project)
  const downloads = stores.length ? [] : downloadsFor(project, release, counts)
  const { en: _translation, ...rest } = project
  return {
    ...rest,
    siteUrl: project.siteHidden ? '' : project.siteUrl,
    // Link tylko do repozytorium, które GitHub potwierdził jako publiczne –
    // prywatne dałoby odwiedzającym tylko 404.
    repo: project.repoHidden || release?.private !== false ? '' : project.repo,
    stores,
    downloads,
    downloadCount: stores.length ? 0 : allReleasesDownloads(project, release, counts),
    release: !stores.length && project.releaseSource === 'github' && release
      ? {
        tag: release.tag,
        name: release.name,
        publishedAt: release.publishedAt,
        // Historia zmian jest na stronie, bo wydania na GitHubie nie są publiczne.
        // Włącza ją przełącznik w panelu (Treści strony → Całe portfolio).
        history: !changelog ? [] : (release.history?.length ? release.history : [release])
          .map(item => ({ tag: item.tag, publishedAt: item.publishedAt, prerelease: item.prerelease === true, notes: item.notes || '' })),
      }
      : null,
  }
}
