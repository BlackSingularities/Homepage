import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/**
 * Podgląd zdjęcia na pełnym ekranie. Strzałki po bokach, klawisze ← →
 * i przesunięcie palcem przechodzą do sąsiednich zrzutów; licznik mówi,
 * ile ich jest. Kliknięcie w tło albo Esc zamyka.
 */
export default function Lightbox({ shots, index, name, onClose, onStep }) {
  const [touchX, setTouchX] = useState(null)
  const shot = shots[index]
  const many = shots.length > 1
  const stop = handler => event => { event.stopPropagation(); handler() }

  // Portal do <body>: treść strony ma własną warstwę (z-index), spod której
  // podgląd nie przykryłby górnego paska.
  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${name}: zrzut ${index + 1} z ${shots.length}`}
      onClick={onClose}
      onTouchStart={event => setTouchX(event.touches[0].clientX)}
      onTouchEnd={event => {
        if (touchX === null) return
        const dx = event.changedTouches[0].clientX - touchX
        if (Math.abs(dx) > 40) onStep(dx < 0 ? 1 : -1)
        setTouchX(null)
      }}
    >
      <button type="button" className="lightbox-close" aria-label="Zamknij" onClick={stop(onClose)} autoFocus><X size={20} /></button>
      {many && (
        <button type="button" className="lightbox-nav is-prev" aria-label="Poprzednie zdjęcie" onClick={stop(() => onStep(-1))}>
          <ChevronLeft size={26} />
        </button>
      )}
      <figure onClick={event => event.stopPropagation()}>
        <img key={shot.src} src={shot.src} alt={shot.alt || `${name} – ekran ${index + 1}`} />
        <figcaption>
          {shot.alt && <span>{shot.alt}</span>}
          {many && <span className="lightbox-count">{index + 1} / {shots.length}</span>}
        </figcaption>
      </figure>
      {many && (
        <button type="button" className="lightbox-nav is-next" aria-label="Następne zdjęcie" onClick={stop(() => onStep(1))}>
          <ChevronRight size={26} />
        </button>
      )}
    </div>,
    document.body,
  )
}
