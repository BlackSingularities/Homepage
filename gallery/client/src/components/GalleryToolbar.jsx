import { IconShield } from './icons'

/**
 * Pasek nad zdjęciami: kolejność, zawężenie zbioru i sposób układania kadrów.
 *
 * Filtry biorą się z samych zdjęć – rok zrobienia i aparat z danych EXIF –
 * więc pojawiają się tylko wtedy, gdy jest z czego wybierać. Nic tu nie
 * przeładowuje strony: wszystko dzieje się na już pobranej liście.
 */
export default function GalleryToolbar({
  sort, onSort, years = [], year, onYear, cameras = [], camera, onCamera,
  layout, onLayout, tileSize, onTileSize, shown, total,
}) {
  return (
    <div className="gal-toolbar">
      <div className="gal-toolbar-group">
        <span>Kolejność</span>
        <select className="gal-select" value={sort} onChange={e => onSort(e.target.value)} aria-label="Kolejność zdjęć">
          <option value="newest">Od najnowszych</option>
          <option value="oldest">Od najstarszych</option>
          <option value="name">Alfabetycznie</option>
        </select>
      </div>

      {years.length > 1 && (
        <div className="gal-toolbar-group">
          <span>Rok</span>
          <select className="gal-select" value={year} onChange={e => onYear(e.target.value)} aria-label="Rok wykonania">
            <option value="">Wszystkie</option>
            {years.map(([value, count]) => (
              <option key={value} value={value}>{value} ({count})</option>
            ))}
          </select>
        </div>
      )}

      {cameras.length > 1 && (
        <div className="gal-toolbar-group">
          <span>Aparat</span>
          <select className="gal-select" value={camera} onChange={e => onCamera(e.target.value)} aria-label="Aparat">
            <option value="">Wszystkie</option>
            {cameras.map(([value, count]) => (
              <option key={value} value={value}>{value} ({count})</option>
            ))}
          </select>
        </div>
      )}

      <div className="gal-toolbar-spacer" />

      <div className="gal-toolbar-group" role="group" aria-label="Układ zdjęć">
        {[['masonry', 'Mozaika'], ['grid', 'Równa siatka']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`gal-chip ${layout === value ? 'is-active' : ''}`}
            onClick={() => onLayout(value)}
            aria-pressed={layout === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="gal-toolbar-group" role="group" aria-label="Wielkość kafelków">
        {[['small', 'S'], ['medium', 'M'], ['large', 'L']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`gal-chip ${tileSize === value ? 'is-active' : ''}`}
            onClick={() => onTileSize(value)}
            aria-pressed={tileSize === value}
            title={`Kafelki: ${value === 'small' ? 'małe' : value === 'medium' ? 'średnie' : 'duże'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <span className="gal-count">
        <IconShield style={{ verticalAlign: '-2px', marginRight: 6, opacity: .7 }} />
        {shown === total ? `${total} ${photoWord(total)}` : `${shown} z ${total} ${photoWord(total)}`}
      </span>
    </div>
  )
}

export function photoWord(n) {
  if (n === 1) return 'zdjęcie'
  const rest = n % 10
  const teens = n % 100
  if (rest >= 2 && rest <= 4 && (teens < 12 || teens > 14)) return 'zdjęcia'
  return 'zdjęć'
}
