import { Check } from 'lucide-react'
import { Reveal } from '../lib/ui'
import ContactForm from './ContactForm'

export default function Contact({ data, brand, scopeOptions, prefill }) {
  return (
    <section className="section contact" id="kontakt">
      <div className="contact-glow" aria-hidden="true" />
      <div className="section-kicker"><span>{data.kicker}</span><span className="section-index">010</span></div>

      <div className="contact-head">
        <Reveal as="h2" className="contact-title">{data.title}<br /><em className="accent">{data.accent}</em></Reveal>
        <Reveal className="contact-side" delay={0.08}>
          <p>{data.lead}</p>
          <ul className="contact-assurances">
            {data.assurances.map(item => <li key={item}><Check size={14} />{item}</li>)}
          </ul>
          {(brand.email || brand.phone) && (
            <div className="contact-direct">
              {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
              {brand.phone && <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>}
            </div>
          )}
        </Reveal>
      </div>

      <Reveal className="contact-panel" amount={0.1}>
        <ContactForm scopeOptions={scopeOptions} prefill={prefill} />
      </Reveal>
    </section>
  )
}
