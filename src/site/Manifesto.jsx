import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return <motion.span className="mf-word" style={{ opacity }}>{children} </motion.span>
}

export default function Manifesto({ data }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.55'] })
  const words = data.lines.join(' \n ').split(' ')

  return (
    <section className="section manifesto" ref={ref}>
      <div className="manifesto-side">
        <span className="section-index">{data.label}</span>
        <p className="manifesto-note">{data.note}</p>
      </div>
      <p className="manifesto-copy">
        {reduce
          ? data.lines.join(' ')
          : words.map((word, index) => (
            word === '\n'
              ? <br key={`br-${index}`} />
              : (
                <Word
                  key={`${word}-${index}`}
                  progress={scrollYProgress}
                  range={[index / words.length, Math.min((index + 6) / words.length, 1)]}
                >
                  {word}
                </Word>
              )
          ))}
      </p>
    </section>
  )
}
