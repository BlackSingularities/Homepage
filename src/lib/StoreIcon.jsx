/**
 * Znaki sklepów z aplikacjami – rysowane w jednym kolorze (currentColor), żeby
 * pasowały do reszty ikon na stronie i nie ciągnęły zewnętrznych grafik.
 */
const PATHS = {
  google: 'M4.6 2.3a1.5 1.5 0 0 0-.6 1.2v17a1.5 1.5 0 0 0 .6 1.2l9.6-9.7Zm10.7 8.6 2.7-2.7-11.7-6.7a1.4 1.4 0 0 0-.6-.2Zm0 2.2-9.6 9.6a1.4 1.4 0 0 0 .6-.2l11.7-6.7Zm1.2-1.1 3 3 2.2-1.3c1-.6 1-2.1 0-2.7L19.5 9Z',
  microsoft: 'M3 3h8.5v8.5H3Zm9.5 0H21v8.5h-8.5ZM3 12.5h8.5V21H3Zm9.5 0H21V21h-8.5Z',
  apple: 'M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6s1.7-.8 3.2-.8 1.9.8 3.2.8 2.2-1.3 3-2.5a10.4 10.4 0 0 0 1.4-2.8 4.2 4.2 0 0 1-2.1-4.2ZM13.9 5a4.3 4.3 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1A3.7 3.7 0 0 0 13.9 5Z',
}

export const STORE_LABEL = { google: 'Google Play', microsoft: 'Microsoft Store', apple: 'App Store' }

export default function StoreIcon({ store, size = 20, ...rest }) {
  if (!PATHS[store]) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d={PATHS[store]} />
    </svg>
  )
}
