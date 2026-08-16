import { Reveal, useSpotlight } from '../lib/ui'
import SectionHead from './SectionHead'

function Card({ card, index }) {
  const spotlight = useSpotlight()
  return (
    <Reveal className="int-card spotlight" delay={index * 0.08} amount={0.3}>
      <div ref={spotlight} className="int-card-inner">
        <h3>{card.title}</h3>
        <p>{card.text}</p>
        <i className="int-glyph" aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>
      </div>
    </Reveal>
  )
}

export default function Intelligence({ data }) {
  return (
    <section className="section intelligence" id="ai">
      <SectionHead title={data.title} accent={data.accent} align="center" />
      <div className="int-grid">
        {(data.cards || []).map((card, index) => <Card card={card} index={index} key={card.title} />)}
      </div>
      <Reveal className="int-chain">
        {(data.chain || []).map((link, index) => (
          <span key={link}>
            <b>{link}</b>
            {index < (data.chain || []).length - 1 && <i />}
          </span>
        ))}
      </Reveal>
    </section>
  )
}
