import { Reveal } from '../lib/ui'
import SectionHead from './SectionHead'

/**
 * Zakres jako lista definicji, nie siatka kart: po lewej nazwa obszaru z
 * jednozdaniowym hasłem, po prawej to, co się pod nim naprawdę robi. Pozycje
 * nie są numerowane, bo nie tworzą kolejności — można zamówić dowolną.
 */
export default function Scope({ data }) {
  const items = data.items || []

  return (
    <section className="section scope" id="zakres">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <dl className="scope-list">
        {items.map((item, index) => (
          <Reveal className="scope-item" key={item.id || item.title} delay={Math.min(index, 4) * 0.05} amount={0.2} y={18}>
            <dt>
              {item.title}
              {item.lead && <span>{item.lead}</span>}
            </dt>
            <dd>{item.detail}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
