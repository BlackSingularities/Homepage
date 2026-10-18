import { localePath } from './i18n'

/**
 * Nagłówek dokumentu przy przejściach w aplikacji. Pierwsze wejście dostaje
 * gotowe meta z serwera (server/seo.mjs); tutaj tylko je podmieniamy, żeby
 * karta, historia i udostępnianie zgadzały się z bieżącym widokiem.
 */

const SITE = 'https://redzikowski.com'
const OG_LOCALE = { pl: 'pl_PL', en: 'en_US' }

function upsert(selector, create, attrs) {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = document.createElement(create.tag)
    Object.entries(create.attrs).forEach(([key, value]) => node.setAttribute(key, value))
    document.head.appendChild(node)
  }
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value))
  return node
}

const meta = (name, content) => upsert(`meta[name="${name}"]`, { tag: 'meta', attrs: { name } }, { content })
const property = (name, content) => upsert(`meta[property="${name}"]`, { tag: 'meta', attrs: { property: name } }, { content })
const absolute = src => (!src ? '' : /^https?:/.test(src) ? src : `${SITE}${src}`)

/** Ucina opis na granicy słowa – tak samo jak serwer. */
export function describe(text, max = 158) {
  const plain = String(text || '').replace(/\s+/g, ' ').trim()
  if (plain.length <= max) return plain
  const cut = plain.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:–-]+$/, '')}…`
}

export function applySeo({ lang, path, title, description, image, noindex = false }) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  if (title) document.title = title
  const canonical = `${SITE}${localePath(path, lang)}`
  if (description) {
    meta('description', description)
    property('og:description', description)
    meta('twitter:description', description)
  }
  if (title) {
    property('og:title', title)
    meta('twitter:title', title)
  }
  meta('robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
  property('og:url', canonical)
  property('og:locale', OG_LOCALE[lang])
  const ogImage = absolute(image) || `${SITE}/og.png`
  property('og:image', ogImage)
  meta('twitter:image', ogImage)
  upsert('link[rel="canonical"]', { tag: 'link', attrs: { rel: 'canonical' } }, { href: canonical })
  for (const [code, target] of [['pl', 'pl'], ['en', 'en'], ['x-default', 'pl']]) {
    upsert(`link[rel="alternate"][hreflang="${code}"]`, { tag: 'link', attrs: { rel: 'alternate', hreflang: code } }, {
      href: `${SITE}${localePath(path, target)}`,
    })
  }
}
