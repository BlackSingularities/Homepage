import { useState } from 'react'
import { Plus } from 'lucide-react'
import SectionHead from './SectionHead'

export default function Faq({ data }) {
  const [open, setOpen] = useState(0)

  return (
    <section className="section rail faq" id="faq">
      <SectionHead title={data.title} accent={data.accent} />
      <div className="faq-list">
        {(data.items || []).map((item, index) => {
          const isOpen = open === index
          return (
            <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : index)}
                aria-expanded={isOpen}
                aria-controls={`faq-${index}`}
              >
                <span>{item.q}</span>
                <Plus size={18} aria-hidden="true" />
              </button>
              <div className="faq-answer" id={`faq-${index}`} hidden={!isOpen}>
                <p>{item.a}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
