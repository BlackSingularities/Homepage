import { Command, FileDown, Monitor, Smartphone, Tablet, Terminal } from 'lucide-react'

/**
 * Wspólny słownik realizacji dla strony i panelu. Kolejność platform jest ta
 * sama, co na serwerze – pliki do pobrania zawsze układają się identycznie.
 */

/** Adres portfolio – jedno miejsce, z którego korzystają wszystkie widoki. */
export const CATALOG_PATH = '/portfolio'

export const KIND_LABEL = { web: 'Strona', app: 'Aplikacja' }

export const PLATFORM_LABEL = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
  other: 'Plik',
}

export const PLATFORM_ICON = {
  windows: Monitor,
  macos: Command,
  linux: Terminal,
  android: Smartphone,
  ios: Tablet,
  other: FileDown,
}

export const PLATFORM_ORDER = ['windows', 'macos', 'linux', 'android', 'ios', 'other']

export function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return ''
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} kB`
  const megabytes = value / 1024 / 1024
  return `${megabytes.toFixed(megabytes < 100 ? 1 : 0)} MB`
}

export function formatReleaseDate(value, locale = 'pl-PL') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/** Adres bez protokołu – na liście liczy się domena, nie `https://`. */
export function hostOf(url) {
  if (!url) return ''
  if (url.startsWith('/')) return `redzikowski.com${url}`
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** Polska odmiana rzeczownika po liczbie: 1 pozycja, 2 pozycje, 5 pozycji. */
export function plural(count, one, few, many) {
  if (count === 1) return one
  const rest = count % 10
  const teens = count % 100
  if (rest >= 2 && rest <= 4 && (teens < 12 || teens > 14)) return few
  return many
}

/** „1 pobranie”, „3 pobrania”, „12 pobrań” – polska odmiana liczebnika. */
export function formatDownloads(count) {
  const n = Number(count) || 0
  const mod10 = n % 10
  const mod100 = n % 100
  const word = n === 1 ? 'pobranie'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'pobrania'
      : 'pobrań'
  return `${new Intl.NumberFormat('pl-PL').format(n)} ${word}`
}
