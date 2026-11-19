/**
 * Czyszczenie wartości przychodzących z panelu. Wydzielone z `index.mjs`, bo
 * korzysta z nich także model realizacji (`projects.mjs`).
 */

export function cleanText(value, max = 5000) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max)
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function slugify(value, fallback = 'strona') {
  const slug = String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
  return slug || fallback
}

/** Przyjmuje wyłącznie ścieżki do mediów na tym serwerze – blokuje `javascript:` i obce hosty. */
export function cleanMedia(value) {
  const raw = cleanText(value, 400)
  if (!raw) return ''
  return /^\/(uploads|assets)\/[\w\-./]+$/.test(raw) ? raw : ''
}

export function cleanLink(value, fallback = '') {
  const raw = cleanText(value, 400)
  if (!raw) return fallback
  if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(raw)) return raw
  return fallback
}

/** `owner/repo` albo pusty łańcuch – nic innego nie trafia do zapytań do GitHuba. */
export function cleanRepo(value) {
  const raw = cleanText(value, 140)
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '')
  return /^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(raw) ? raw : ''
}

export function uniqueSlug(slug, items, selfId) {
  let candidate = slug
  let counter = 2
  while (items.some(item => item.slug === candidate && item.id !== selfId)) {
    candidate = `${slug}-${counter++}`
  }
  return candidate
}

/** Słowa kluczowe – bez powtórzeń, bez pustych. */
export function cleanKeywords(input) {
  const seen = new Set()
  return (Array.isArray(input) ? input : String(input || '').split(','))
    .map(item => cleanText(item, 60))
    .filter(item => item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()))
    .slice(0, 12)
}

/** Pytania i odpowiedzi pod opisem pracy – trafiają też do danych FAQPage. */
export function cleanFaq(input) {
  return (Array.isArray(input) ? input : [])
    .slice(0, 8)
    .map(item => ({ q: cleanText(item?.q, 200), a: cleanText(item?.a, 1000) }))
    .filter(item => item.q && item.a)
}
