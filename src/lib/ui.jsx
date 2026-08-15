import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

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

/** Warm light that trails the cursor across the page. Decorative, desktop only. */
export function PointerGlow() {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || reduce || window.matchMedia('(hover: none)').matches) return undefined
    let frame = 0
    const move = event => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        node.style.setProperty('--px', `${event.clientX}px`)
        node.style.setProperty('--py', `${event.clientY}px`)
        node.style.opacity = '1'
      })
    }
    const hide = () => { node.style.opacity = '0' }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', hide)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', hide)
    }
  }, [reduce])

  return <div className="pointer-glow" ref={ref} aria-hidden="true" />
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

/** Fixed dot navigation mirroring the sections currently on screen. */
export function SectionRail({ sections }) {
  const active = useActiveSection(sections.map(([id]) => id))
  return (
    <nav className="section-rail" aria-label="Sekcje strony">
      {sections.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className={active === id ? 'is-active' : ''}
          aria-current={active === id ? 'location' : undefined}
        >
          <i aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}
