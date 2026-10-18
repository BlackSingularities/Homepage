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
    year: cleanText(input?.year, 12),
    tagline: cleanText(input?.tagline, 300),
    summary: cleanText(input?.summary, 1200),
    body: cleanText(input?.body, 14000),
    role: cleanText(input?.role, 300),
    stack: (Array.isArray(input?.stack) ? input.stack : [])
      .slice(0, 20).map(item => cleanText(item, 60)).filter(Boolean),
    features: (Array.isArray(input?.features) ? input.features : [])
      .slice(0, 20).map(item => cleanText(item, 200)).filter(Boolean),
    cover: cleanMedia(input?.cover),
    shots: (Array.isArray(input?.shots) ? input.shots : [])
      .slice(0, 24).map(sanitizeShot).filter(shot => shot.src),
    siteUrl: cleanLink(input?.siteUrl),
    siteHidden: input?.siteHidden === true,
    repo: cleanRepo(input?.repo),
    repoHidden: input?.repoHidden !== false,
    releaseSource: kind === 'app' ? releaseSource : 'none',
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

/** Wiersz listy na stronie głównej i w portfolio – bez pełnego opisu i galerii. */
export function projectSummary(project, release, counts = {}) {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    kind: project.kind,
    label: project.label,
    year: project.year,
    tagline: project.tagline,
    cover: project.cover,
    featured: project.featured,
    site: project.siteHidden ? '' : project.siteUrl,
    platforms: [...new Set(downloadsFor(project, release).map(item => item.platform))]
      .sort((a, b) => (PLATFORM_ORDER.get(a) ?? 99) - (PLATFORM_ORDER.get(b) ?? 99)),
    shots: project.shots.length,
    downloadCount: totalDownloads(downloadsFor(project, release, counts)),
  }
}

/**
 * Łączy ręczne pozycje z plikami wydania – zależnie od wybranego źródła.
 * Pliki z prywatnego repozytorium nie mają publicznego adresu, więc kierujemy
 * je przez proxy serwera, które dokłada token.
 */
export function downloadsFor(project, release, counts = {}) {
  if (project.kind !== 'app') return []
  const local = id => Number(counts[`${project.slug}/${id}`]) || 0
  if (project.releaseSource === 'manual') {
    return project.downloads.map(item => ({ ...item, count: local(item.id) })).sort(sortByPlatform)
  }
  if (project.releaseSource !== 'github' || !release) return []
  return (release.assets || [])
    .map(asset => ({
      id: asset.id,
      platform: asset.platform,
      label: asset.label,
      version: asset.version,
      size: asset.size,
      // GitHub liczy każde pobranie (także te spoza strony); proxy prywatnych
      // wydań też przechodzi przez GitHuba, więc lokalny licznik to tylko zapas.
      count: Math.max(Number(asset.downloadCount) || 0, local(asset.id)),
      url: release.private || !asset.directUrl
        ? `/api/projects/${project.slug}/asset/${asset.id}`
        : asset.directUrl,
    }))
    .sort(sortByPlatform)
}

export const totalDownloads = downloads => downloads.reduce((sum, item) => sum + (Number(item.count) || 0), 0)

export function publicProject(project, release, counts = {}) {
  const downloads = downloadsFor(project, release, counts)
  const { en: _translation, ...rest } = project
  return {
    ...rest,
    siteUrl: project.siteHidden ? '' : project.siteUrl,
    repo: project.repoHidden ? '' : project.repo,
    downloads,
    downloadCount: totalDownloads(downloads),
    release: project.releaseSource === 'github' && release
      ? { tag: release.tag, name: release.name, publishedAt: release.publishedAt, url: release.url }
      : null,
  }
}
