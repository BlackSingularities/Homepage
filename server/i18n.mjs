import { cleanText } from './sanitize.mjs'

/**
 * Wersje językowe treści. Polski jest językiem bazowym: realizacje i podstrony
 * trzymają angielskie tłumaczenie w polu `en`, a puste pola angielskie
 * spadają na polski oryginał – strona nigdy nie pokaże pustego miejsca.
 */

export const LANGS = ['pl', 'en']
export const DEFAULT_LANG = 'pl'

export const langOf = value => (LANGS.includes(value) ? value : DEFAULT_LANG)

const filled = value => (Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim()))

/** Nakłada niepuste pola tłumaczenia na oryginał. */
function overlay(base, translation, keys) {
  if (!translation || typeof translation !== 'object') return base
  const result = { ...base }
  for (const key of keys) {
    if (filled(translation[key])) result[key] = translation[key]
  }
  return result
}

/* ── realizacje ──────────────────────────────────────────────────────── */

export const PROJECT_TEXT_KEYS = ['label', 'tagline', 'summary', 'body', 'role', 'features']

export function sanitizeProjectTranslation(input) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    label: cleanText(source.label, 120),
    tagline: cleanText(source.tagline, 300),
    summary: cleanText(source.summary, 1200),
    body: cleanText(source.body, 14000),
    role: cleanText(source.role, 300),
    features: (Array.isArray(source.features) ? source.features : [])
      .slice(0, 20).map(item => cleanText(item, 200)).filter(Boolean),
    shotAlts: (Array.isArray(source.shotAlts) ? source.shotAlts : [])
      .slice(0, 24).map(item => cleanText(item, 200)),
  }
}

export function localizeProject(project, lang) {
  if (langOf(lang) === DEFAULT_LANG || !project.en) return project
  const result = overlay(project, project.en, PROJECT_TEXT_KEYS)
  const alts = project.en.shotAlts || []
  // Plakaty z repozytorium nie mają tłumaczeń w panelu – indeks liczymy bez nich.
  let index = 0
  result.shots = (project.shots || []).map(shot => {
    if (shot.poster) return { ...shot, alt: shot.altEn || shot.alt }
    const alt = alts[index++]
    return alt ? { ...shot, alt } : shot
  })
  return result
}

/** Czy tłumaczenie ma treść – sitemap i hreflang wskazują tylko gotowe wersje. */
export const hasProjectTranslation = project => filled(project.en?.tagline) || filled(project.en?.body)

/* ── podstrony ───────────────────────────────────────────────────────── */

export const PAGE_TEXT_KEYS = ['title', 'kicker', 'excerpt', 'lead', 'seoDescription', 'blocks']

export function localizePage(page, lang) {
  if (langOf(lang) === DEFAULT_LANG || !page.en) return page
  return overlay(page, page.en, PAGE_TEXT_KEYS)
}

export const hasPageTranslation = page => filled(page.en?.title)
