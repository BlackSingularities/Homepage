/**
 * Lista kontrolna wpisu w portfolio. Każdy punkt to coś, co realnie pomaga
 * pracy w wyszukiwarce albo na stronie: długości zgodne z tym, co Google
 * pokazuje w wynikach, opisy zdjęć, pytania FAQ, wersja angielska.
 * `tab` mówi edytorowi, gdzie poprawić dany punkt.
 */

const len = value => String(value || '').trim().length

export const SEO_TITLE = { min: 30, max: 60 }
export const SEO_DESCRIPTION = { min: 110, max: 160 }

/** Tytuł karty – ta sama reguła co server/seo.mjs (projectTitle). */
export function seoTitleOf(project, lang = 'pl') {
  const source = lang === 'en' ? { ...project, ...pick(project.en) } : project
  const kind = source.kind === 'app' ? (lang === 'en' ? 'Application' : 'Aplikacja') : (lang === 'en' ? 'Website' : 'Strona')
  const base = source.seoTitle || `${source.name} – ${source.label || kind}`
  const full = `${base} | Adam Rędzikowski`
  return full.length <= 70 ? full : base
}

/** Opis do wyników: własny albo zdanie z listy – tak samo jak na serwerze. */
export function seoDescriptionOf(project, lang = 'pl') {
  const source = lang === 'en' ? { ...project, ...pick(project.en) } : project
  const plain = String(source.seoDescription || source.tagline || source.summary || source.body || '').replace(/\s+/g, ' ').trim()
  if (plain.length <= 158) return plain
  const cut = plain.slice(0, 157)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:–-]+$/, '')}…`
}

/** Niepuste pola tłumaczenia – puste spadają na polski oryginał. */
function pick(translation = {}) {
  return Object.fromEntries(Object.entries(translation || {}).filter(([, value]) => (Array.isArray(value) ? value.length : len(value))))
}

export function readiness(project) {
  const shots = (project.shots || []).filter(shot => !shot.poster)
  const en = project.en || {}
  const checks = [
    ['tagline', 'Zdanie na liście', len(project.tagline) >= 40, 'content', 'Jedno zdanie, które widać w portfolio (min. 40 znaków).'],
    ['summary', 'Wprowadzenie', len(project.summary) >= 120, 'content', 'Pierwszy akapit – co to jest i dla kogo (min. 120 znaków).'],
    ['body', 'Opis', len(project.body) >= 600, 'content', 'Pełny opis to treść, którą indeksuje Google (min. 600 znaków).'],
    ['features', 'Funkcje', (project.features || []).length >= 4, 'content', 'Co najmniej 4 konkretne funkcje.'],
    ['image', 'Ikona lub okładka', Boolean(project.icon || project.cover), 'media', 'Obrazek do listy i podglądu linku.'],
    ['shots', 'Zrzuty ekranu', (project.shots || []).length >= 3, 'media', 'Co najmniej 3 zrzuty – Google pokazuje je w grafice.'],
    ['alts', 'Opisy zdjęć', shots.length > 0 && shots.every(shot => len(shot.alt) >= 8), 'media', 'Każdy zrzut potrzebuje opisu (alt) – co na nim widać.'],
    ['seoTitle', 'Tytuł w Google', len(project.seoTitle) >= SEO_TITLE.min && len(project.seoTitle) <= SEO_TITLE.max + 5, 'seo', `Nazwa i to, czego ludzie szukają (${SEO_TITLE.min}–${SEO_TITLE.max} znaków).`],
    ['seoDescription', 'Opis w Google', len(project.seoDescription) >= SEO_DESCRIPTION.min && len(project.seoDescription) <= SEO_DESCRIPTION.max, 'seo', `Zachęta do kliknięcia (${SEO_DESCRIPTION.min}–${SEO_DESCRIPTION.max} znaków).`],
    ['keywords', 'Słowa kluczowe', (project.keywords || []).length >= 4, 'seo', 'Co najmniej 4 frazy, które ktoś wpisałby w wyszukiwarkę.'],
    ['category', 'Kategoria', Boolean(project.category), 'seo', 'Rodzaj programu dla danych strukturalnych.'],
    ['faq', 'Pytania FAQ', (project.faq || []).length >= 3, 'seo', 'Co najmniej 3 pytania – mogą pojawić się w wynikach.'],
    ['en', 'Wersja angielska', len(en.tagline) > 0 && len(en.body) > 0 && len(en.seoTitle) > 0, 'content', 'Zdanie, opis i tytuł SEO po angielsku – strona /en.'],
  ].map(([id, label, ok, tab, hint]) => ({ id, label, ok, tab, hint }))
  const done = checks.filter(check => check.ok).length
  return { checks, done, total: checks.length, score: Math.round((done / checks.length) * 100) }
}

export const meterTone = score => (score >= 85 ? 'is-high' : score >= 60 ? 'is-mid' : 'is-low')
