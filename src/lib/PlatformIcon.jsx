import { FileDown, Terminal } from 'lucide-react'

/**
 * Znaki systemów przy plikach do pobrania – jednokolorowe (currentColor), tak
 * jak plakietki sklepów. Windows portable ma ten sam znak z dopiskiem strzałki
 * „uruchom bez instalacji”, żeby odróżnić go od instalatora jednym rzutem oka.
 */
const WINDOWS = 'M3 4.8 10.4 3.8v7.1H3Zm8.4-1.1L21 2.4v8.5h-9.6ZM3 12.1h7.4v7.1L3 18.2Zm8.4 0H21v8.5l-9.6-1.3Z'
const ANDROID = 'M17.6 9.5l1.8-3.2a.4.4 0 0 0-.6-.4l-1.9 3.2a11.4 11.4 0 0 0-9.8 0L5.2 5.9a.4.4 0 0 0-.6.4l1.8 3.2A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.5ZM7 15.3A1.3 1.3 0 1 1 8.3 14 1.3 1.3 0 0 1 7 15.3Zm10 0A1.3 1.3 0 1 1 18.3 14 1.3 1.3 0 0 1 17 15.3Z'
const APPLE = 'M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6s1.7-.8 3.2-.8 1.9.8 3.2.8 2.2-1.3 3-2.5a10.4 10.4 0 0 0 1.4-2.8 4.2 4.2 0 0 1-2.1-4.2ZM13.9 5a4.3 4.3 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1A3.7 3.7 0 0 0 13.9 5Z'

/** Wariant pliku: instalator Windows i wersja przenośna mają osobne ikony i nazwy. */
export function fileVariant(file) {
  if (file?.platform === 'windows' && /portable/i.test(`${file.label || ''} ${file.name || ''}`)) return 'windows-portable'
  return file?.platform || 'other'
}

export default function PlatformIcon({ platform, size = 18, ...rest }) {
  if (platform === 'linux') return <Terminal size={size} {...rest} />
  if (platform === 'windows-portable') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
        <path d="M2 4.2 8.4 3.3v6.1H2Zm7.2-1 8.3-1.1v7.3H9.2ZM2 10.5h6.4v6.1L2 15.7Zm7.2 0h8.3v7.3l-8.3-1.1Z" fill="currentColor" transform="scale(.82)" />
        <path d="M15.5 21.5h6v-6M21.5 21.5l-6.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  const d = { windows: WINDOWS, android: ANDROID, ios: APPLE, macos: APPLE }[platform]
  if (!d) return <FileDown size={size} {...rest} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d={d} />
    </svg>
  )
}
