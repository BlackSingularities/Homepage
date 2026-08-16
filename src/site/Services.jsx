import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Plus } from 'lucide-react'
import { Reveal, ease, useSpotlight } from '../lib/ui'
import SectionHead from './SectionHead'

function Detail({ service }) {
  const spotlight = useSpotlight()
  return (
    <motion.div
      className="svc-detail spotlight"
      ref={spotlight}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      <div className="svc-detail-head">
        <h3>{service.title}</h3>
      </div>
      <p className="svc-detail-lead">{service.lead}</p>
      <p className="svc-detail-text">{service.detail}</p>
      <a className="svc-detail-cta" href="#kontakt">
        Zapytaj o ten zakres <ArrowUpRight size={16} />
      </a>
    </motion.div>
  )
}

export default function Services({ data }) {
  const [active, setActive] = useState(0)
  const [openMobile, setOpenMobile] = useState(0)
  const items = data.items || []
  const service = items[Math.min(active, items.length - 1)]

  return (
    <section className="section services" id="uslugi">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />

      {/* Selector on wide screens, accordion on narrow ones — CSS picks one. */}
      <Reveal className="svc-layout">
        <div className="svc-list" role="tablist" aria-label="Zakres usług">
          {items.map((item, index) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={index === active}
              className={index === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
            >
              <span className="svc-name">{item.title}</span>
              <span className="svc-arrow"><ArrowUpRight size={16} /></span>
            </button>
          ))}
        </div>
        <div className="svc-panel">
          {service && <Detail service={service} key={service.id} />}
        </div>
      </Reveal>

      <div className="svc-accordion">
        {items.map((item, index) => (
          <article key={item.id} className={openMobile === index ? 'is-open' : ''}>
            <button onClick={() => setOpenMobile(openMobile === index ? -1 : index)} aria-expanded={openMobile === index}>
              <span className="svc-name">{item.title}</span>
              <Plus size={18} />
            </button>
            <AnimatePresence initial={false}>
              {openMobile === index && (
                <motion.div
                  className="svc-accordion-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <p className="svc-detail-lead">{item.lead}</p>
                  <p className="svc-detail-text">{item.detail}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        ))}
      </div>
    </section>
  )
}
