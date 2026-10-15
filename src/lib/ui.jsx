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

/**
 * Nagłówek odsłaniany słowo po słowie.
 *
 * Odstęp stoi POZA kafelkiem słowa: `inline-block` jest nierozerwalny, więc
 * spacja schowana w środku nie daje przeglądarce miejsca na złamanie linii
 * i długi nagłówek wyjeżdża poza kolumnę.
 */
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
        }}>{word}</motion.span>
      )).flatMap((node, index) => (index ? [' ', node] : [node]))}
      {accentWords.length > 0 && (
        <em className="accent">
          {accentWords.map((word, index) => (
            <motion.span className="kinetic-word" key={`accent-${index}`} variants={{
              hidden: { opacity: 0, y: '0.4em', filter: 'blur(10px)' },
              show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease } },
            }}>{word}</motion.span>
          )).flatMap((node, index) => (index ? [' ', node] : [node]))}
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

/**
 * Podświetlenie pozycji w nawigacji. Startuje puste — dopóki nie widać żadnej
 * sekcji, żadna nie udaje aktywnej.
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState('')
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
