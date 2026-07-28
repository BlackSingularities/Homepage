import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

export const ease = [0.22, 1, 0.36, 1]

export const reveal = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}

export const stagger = (delay = 0.07) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
})

/** Scroll-triggered entrance used by every section. */
export function Reveal({ children, delay = 0, y = 26, className, as = 'div', amount = 0.25, ...rest }) {
  const Component = motion[as] || motion.div
  const reduce = useReducedMotion()
  if (reduce) {
    const Plain = as
    return <Plain className={className} {...rest}>{children}</Plain>
  }
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.75, ease, delay }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/** Headline that reveals word by word. */
export function KineticText({ text, accent, className }) {
  const reduce = useReducedMotion()
  const words = useMemo(() => String(text || '').split(' ').filter(Boolean), [text])
  const accentWords = useMemo(() => String(accent || '').split(' ').filter(Boolean), [accent])

  if (reduce) {
    return <span className={className}>{text} {accent && <em>{accent}</em>}</span>
  }

  return (
    <motion.span className={className} initial="hidden" animate="show" variants={stagger(0.055)}>
      {words.map((word, index) => (
        <motion.span className="kinetic-word" key={`${word}-${index}`} variants={{
          hidden: { opacity: 0, y: '0.5em', filter: 'blur(8px)' },
          show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease } },
        }}>{word}{' '}</motion.span>
      ))}
      {accentWords.length > 0 && (
        <em className="accent">
          {accentWords.map((word, index) => (
            <motion.span className="kinetic-word" key={`accent-${index}`} variants={{
              hidden: { opacity: 0, y: '0.4em', filter: 'blur(10px)' },
              show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease } },
            }}>{word}{' '}</motion.span>
          ))}
        </em>
      )}
    </motion.span>
  )
}

/** Writes pointer position into CSS custom properties for hover spotlights. */
export function useSpotlight() {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node || window.matchMedia('(hover: none)').matches) return undefined
    const move = event => {
      const rect = node.getBoundingClientRect()
      node.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
      node.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
    }
    node.addEventListener('pointermove', move)
    return () => node.removeEventListener('pointermove', move)
  }, [])
  return ref
}

/** Subtle 3D tilt following the cursor. */
export function useTilt(strength = 7) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const node = ref.current
    if (!node || reduce || window.matchMedia('(hover: none)').matches) return undefined
    let frame = 0
    const move = event => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        node.style.transform = `perspective(1400px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) translateY(-6px)`
      })
    }
    const reset = () => {
      cancelAnimationFrame(frame)
      node.style.transform = ''
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerleave', reset)
    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerleave', reset)
    }
  }, [strength, reduce])
  return ref
}

/** Counts up to `value` once the element scrolls into view. */
export function Counter({ value, suffix = '', duration = 1500 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const target = Number(String(value).replace(/[^\d.]/g, '')) || 0
  const prefix = String(value).replace(/[\d.].*$/, '')
  const [display, setDisplay] = useState(reduce ? target : 0)

  // A number stuck at zero looks broken, so the final value always lands even if
  // the count-up never gets a chance to run (hidden tab, no frames, no observer).
  useEffect(() => {
    const guard = setTimeout(() => setDisplay(target), 2600)
    return () => clearTimeout(guard)
  }, [target])

  useEffect(() => {
    if (!inView || reduce) return undefined
    let frame = 0
    const start = performance.now()
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const safety = setTimeout(() => setDisplay(target), duration + 250)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(safety)
    }
  }, [inView, target, duration, reduce])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

/** Tracks which section is currently in the viewport for nav highlighting. */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.6] },
    )
    ids.forEach(id => {
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [ids.join(',')])
  return active
}

export function scrollToId(id) {
  const node = document.getElementById(id)
  if (!node) return
  node.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
