import { forwardRef, useCallback, useRef } from 'react'

/**
 * Kafelek ze świecącą, kolorową krawędzią, która podąża za kursorem.
 *
 * Trzy warstwy leżą w tle elementu: kolorowa obwódka z gradientu siatkowego,
 * delikatne przebarwienie brzegów od środka i właściwa poświata. Każdą maskuje
 * gradient stożkowy obrócony w stronę kursora, a jasność rośnie, im bliżej
 * krawędzi jest wskaźnik. Bez kursora nic nie świeci.
 *
 * `media` – wariant na zdjęcia: warstwy idą nad obraz, bez przebarwienia środka.
 */

const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max)
const round = value => Math.round(value * 1000) / 1000

function track(element, event) {
  const rect = element.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const cx = rect.width / 2
  const cy = rect.height / 2
  const dx = x - cx
  const dy = y - cy

  // Odległość od środka w skali 0–1, gdzie 1 to krawędź elementu.
  const kx = dx ? cx / Math.abs(dx) : Infinity
  const ky = dy ? cy / Math.abs(dy) : Infinity
  const edge = clamp(1 / Math.min(kx, ky), 0, 1)

  let angle = 0
  if (dx || dy) {
    angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
  }

  element.style.setProperty('--pointer-x', `${round(clamp((100 / rect.width) * x))}%`)
  element.style.setProperty('--pointer-y', `${round(clamp((100 / rect.height) * y))}%`)
  element.style.setProperty('--pointer-deg', `${round(angle)}deg`)
  element.style.setProperty('--pointer-d', `${round(edge * 100)}`)
}

const GlowEdge = forwardRef(function GlowEdge(
  { as: Tag = 'div', media = false, className = '', children, onPointerMove, ...rest },
  forwardedRef,
) {
  const localRef = useRef(null)
  const setRef = useCallback(node => {
    localRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }, [forwardedRef])

  const handleMove = event => {
    if (localRef.current) track(localRef.current, event)
    onPointerMove?.(event)
  }

  return (
    <Tag
      ref={setRef}
      className={`glow-edge ${media ? 'is-media' : ''} ${className}`.trim()}
      onPointerMove={handleMove}
      {...rest}
    >
      <span className="glow-edge-border" aria-hidden="true" />
      {!media && <span className="glow-edge-bg" aria-hidden="true" />}
      <span className="glow-edge-glow" aria-hidden="true" />
      {children}
    </Tag>
  )
})

export default GlowEdge
