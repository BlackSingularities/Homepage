import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useT } from '../lib/i18n'

/**
 * Podgląd zdjęcia na pełnym ekranie. Strzałki po bokach, klawisze ← →
 * i przesunięcie palcem przechodzą do sąsiednich zrzutów; licznik mówi,
 * ile ich jest. Kliknięcie w tło albo Esc zamyka.
 *
 * Dwuklik na obrazie przełącza między dopasowaniem do ekranu a skalą 100%
 * (piksel obrazu = piksel CSS) z przewijaniem – przydaje się przy wysokich
 * plakatach. Kliknięte miejsce zostaje pod kursorem.
 */
export default function Lightbox({ shots, index, name, onClose, onStep }) {
  const { t } = useT()
  const [touchX, setTouchX] = useState(null)
  // Skala 100% dotyczy jednego zdjęcia – po przejściu do innego wraca dopasowanie.
  const [actual, setActual] = useState(null)
  const isActual = actual?.index === index
  const root = useRef(null)
  const shot = shots[index]
  const many = shots.length > 1
  const stop = handler => event => { event.stopPropagation(); handler() }

  const toggleActual = event => {
    event.stopPropagation()
    if (isActual) {
      setActual(null)
      return
    }
    const box = event.currentTarget.getBoundingClientRect()
    setActual({
      index,
      fx: (event.clientX - box.left) / box.width,
      fy: (event.clientY - box.top) / box.height,
      cx: event.clientX,
      cy: event.clientY,
    })
  }

  // Po powiększeniu przewiń tak, by kliknięty punkt obrazu został pod kursorem.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (!isActual) {
      el.scrollTo(0, 0)
      return
    }
    const img = el.querySelector('figure img')
    if (!img) return
    const box = img.getBoundingClientRect()
    el.scrollLeft += box.left + actual.fx * box.width - actual.cx
    el.scrollTop += box.top + actual.fy * box.height - actual.cy
  }, [isActual, actual])

  // Portal do <body>: treść strony ma własną warstwę (z-index), spod której
  // podgląd nie przykryłby górnego paska.
  return createPortal(
    <div
      ref={root}
      className={`lightbox${isActual ? ' is-actual' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('lightbox.label', name, index + 1, shots.length)}
      onClick={onClose}
      onTouchStart={event => setTouchX(event.touches[0].clientX)}
      onTouchEnd={event => {
        if (touchX === null || isActual) return
        const dx = event.changedTouches[0].clientX - touchX
        if (Math.abs(dx) > 40) onStep(dx < 0 ? 1 : -1)
        setTouchX(null)
      }}
    >
      <button type="button" className="lightbox-close" aria-label={t('lightbox.close')} onClick={stop(onClose)} autoFocus><X size={20} /></button>
      {many && (
        <button type="button" className="lightbox-nav is-prev" aria-label={t('lightbox.prev')} onClick={stop(() => onStep(-1))}>
          <ChevronLeft size={26} />
        </button>
      )}
      <figure onClick={event => event.stopPropagation()}>
        <img
          key={shot.src}
          src={shot.src}
          alt={shot.alt || t('project.shot', name, index + 1)}
          title={isActual ? t('lightbox.fit') : t('lightbox.zoom')}
          onDoubleClick={toggleActual}
        />
        <figcaption>
          {shot.alt && <span>{shot.alt}</span>}
          {many && <span className="lightbox-count">{index + 1} / {shots.length}</span>}
        </figcaption>
      </figure>
      {many && (
        <button type="button" className="lightbox-nav is-next" aria-label={t('lightbox.next')} onClick={stop(() => onStep(1))}>
          <ChevronRight size={26} />
        </button>
      )}
    </div>,
    document.body,
  )
}
