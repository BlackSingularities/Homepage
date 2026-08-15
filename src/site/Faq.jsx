import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Reveal, ease } from '../lib/ui'
import SectionHead from './SectionHead'

export default function Faq({ data }) {
  const [open, setOpen] = useState(0)

  return (
    <section className="section faq" id="faq">
      <SectionHead title={data.title} accent={data.accent} />
      <div className="faq-list">
        {(data.items || []).map((item, index) => (
          <Reveal className={`faq-item ${open === index ? 'is-open' : ''}`} key={item.q} delay={index * 0.04} amount={0.3}>
            <button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>
              <span>{item.q}</span>
              <i><Plus size={17} /></i>
            </button>
            <AnimatePresence initial={false}>
              {open === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.34, ease }}
                  className="faq-answer"
                >
                  <p>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
