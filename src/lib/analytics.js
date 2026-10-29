/**
 * Analityka strony – zdarzenia idą wyłącznie do własnego API (`/api/track`).
 *
 * Bez zgody wysyłamy tylko anonimowe odsłony i pobrania (bez identyfikatora,
 * bez odsyłacza). Po zgodzie dokładamy losowy identyfikator odwiedzającego
 * (localStorage) i sesji (sessionStorage), źródło wejścia, język, rozdzielczość
 * i czas spędzony na podstronie.
 */

const CONSENT_KEY = 'ar-consent'
const VISITOR_KEY = 'ar-vid'
const SESSION_KEY = 'ar-sid'
export const CONSENT_EVENT = 'ar:consent-open'

const store = (storage, key, value) => {
  try {
    if (value === undefined) return storage.getItem(key)
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  } catch { /* prywatne okno lub zablokowane dane */ }
  return value
}

const randomId = () => (globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)

export const getConsent = () => store(localStorage, CONSENT_KEY) || ''

const granted = () => getConsent() === 'granted'

let newVisitor = false
let firstLanding = true

function identity() {
  if (!granted()) return {}
  let vid = store(localStorage, VISITOR_KEY)
  if (!vid) {
    vid = store(localStorage, VISITOR_KEY, randomId())
    newVisitor = true
  }
  let sid = store(sessionStorage, SESSION_KEY)
  if (!sid) sid = store(sessionStorage, SESSION_KEY, randomId())
  return {
    vid,
    sid,
    lang: navigator.language || '',
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    newVisitor,
  }
}

function send(payload) {
  if (window.location.pathname.startsWith('/admin')) return
  const body = JSON.stringify({ ...payload, consent: granted(), ...identity() })
  try {
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
  } catch { /* fallback niżej */ }
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    .catch(() => undefined)
}

let current = { path: '', since: 0 }

function flushLeave() {
  if (!current.path || !granted()) return
  const ms = Date.now() - current.since
  if (ms > 500) send({ type: 'leave', path: current.path, ms })
  current = { path: '', since: 0 }
}

export function trackPageview(path = window.location.pathname) {
  if (path === current.path) return
  flushLeave()
  current = { path, since: Date.now() }
  const extra = {}
  if (firstLanding) {
    extra.ref = document.referrer || ''
    extra.utm = new URLSearchParams(window.location.search).get('utm_source') || ''
    firstLanding = false
  }
  send({ type: 'pageview', path, ...extra })
}

export function trackDownload({ project, asset, platform, version }) {
  // Wersję zapisujemy razem ze zdarzeniem: identyfikatory plików z GitHuba
  // znikają z wydania przy kolejnej publikacji, a dziennik ma je pamiętać.
  send({ type: 'download', path: window.location.pathname, project, asset, platform, version })
}

export function trackEvent(name) {
  send({ type: 'event', path: window.location.pathname, name })
}

export function setConsent(value) {
  const previous = getConsent()
  store(localStorage, CONSENT_KEY, value)
  if (value === 'denied') {
    store(localStorage, VISITOR_KEY, null)
    store(sessionStorage, SESSION_KEY, null)
  }
  if (previous !== value) send({ type: 'consent', path: window.location.pathname, value })
}

export const openConsent = () => window.dispatchEvent(new CustomEvent(CONSENT_EVENT))

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushLeave()
    else if (!current.path) current = { path: window.location.pathname, since: Date.now() }
  })
}
