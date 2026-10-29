import GlowEdge from '../lib/GlowEdge'
import Heading from './Heading'
import ContactForm from './ContactForm'

export default function Contact({ data, brand, scopeOptions }) {
  return (
    <section className="section contact" id="kontakt">
      <div className="contact-head">
        <h2 className="contact-title"><Heading title={data.title} accent={data.accent} /></h2>
        <div className="contact-side">
          <p>{data.lead}</p>
          {(brand.email || brand.phone) && (
            <div className="contact-direct">
              {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
              {brand.phone && <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>}
            </div>
          )}
        </div>
      </div>

      <GlowEdge className="contact-panel" id="formularz">
        <ContactForm scopeOptions={scopeOptions} />
      </GlowEdge>
    </section>
  )
}
