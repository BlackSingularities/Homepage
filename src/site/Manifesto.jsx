import { motion, useReducedMotion } from 'framer-motion'
import { ease } from '../lib/ui'
import TextBreak from './TextBreak'

export default function Manifesto({ data }) {
  const reduce = useReducedMotion()
  const lines = data.lines || []

  return (
    <section className="section manifesto" id="manifest">
      <div className="manifesto-copy">
        {lines.map((line, index) => (
          <motion.p
            className={index === lines.length - 1 ? 'is-accent' : ''}
            key={line}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.65 }}
            transition={{ duration: 0.8, delay: index * 0.12, ease }}
          >
            <TextBreak text={line} before={index === lines.length - 1 ? 'sposobu pracy.' : undefined} />
          </motion.p>
        ))}
      </div>
      <motion.aside
        className="manifesto-note"
        initial={reduce ? false : { opacity: 0, x: 24 }}
        whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.75, delay: 0.2, ease }}
      >
        <i aria-hidden="true" />
        <p>{data.note}</p>
      </motion.aside>
    </section>
  )
}
