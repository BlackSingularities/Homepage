import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)
  const pos     = useRef({ x: -100, y: -100 })
  const ring    = useRef({ x: -100, y: -100 })
  const raf     = useRef(null)
  const hovered = useRef(false)

  useEffect(() => {
    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    const onEnter = () => { hovered.current = true }
    const onLeave = () => { hovered.current = false }

    const interactables = () =>
      document.querySelectorAll('a, button, [data-cursor]')

    const bindHover = () => {
      interactables().forEach(el => {
        el.addEventListener('mouseenter', onEnter)
        el.addEventListener('mouseleave', onLeave)
      })
    }

    const lerp = (a, b, t) => a + (b - a) * t

    const tick = () => {
      if (!dotRef.current || !ringRef.current) return

      dotRef.current.style.transform =
        `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`

      ring.current.x = lerp(ring.current.x, pos.current.x, 0.14)
      ring.current.y = lerp(ring.current.y, pos.current.y, 0.14)

      const scale = hovered.current ? 1.8 : 1
      ringRef.current.style.transform =
        `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px) scale(${scale})`
      ringRef.current.style.opacity = hovered.current ? '0.7' : '0.3'

      raf.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    bindHover()
    raf.current = requestAnimationFrame(tick)

    const mo = new MutationObserver(bindHover)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf.current)
      mo.disconnect()
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  )
}
