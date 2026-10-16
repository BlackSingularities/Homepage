/** Kropka na końcu nagłówka sekcji jest zbędna – zostaje tylko w hero. */
export function trimDot(text) {
  return String(text || '').trim().replace(/[.]+$/, '')
}

/**
 * Treść nagłówka z panelu: tytuł i złota końcówka („accent”). Gdy jest
 * końcówka, kropkę zdejmujemy z niej; gdy jej nie ma – z samego tytułu.
 */
export default function Heading({ title, accent }) {
  if (!accent) return <>{trimDot(title)}</>
  return <>{String(title || '').trim()} <em className="accent">{trimDot(accent)}</em></>
}
