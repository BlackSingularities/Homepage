import SectionHead from './SectionHead'
import GlowEdge from '../lib/GlowEdge'

/**
 * Zakres to równoległe obszary pracy, nie kolejność – więc nie dostają
 * numerów ani jednej długiej listy. Każdy stoi we własnym panelu: nazwa,
 * pod nią zdanie o tym, co z tego ma zamawiający, a niżej, ciszej, co
 * dokładnie wchodzi w zakres.
 */
export default function Scope({ data }) {
  return (
    <section className="section rail" id="zakres">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <dl className="scope-grid">
        {(data.items || []).map(item => (
          <GlowEdge as="div" className="scope-panel" key={item.id || item.title}>
            <dt>{item.title}</dt>
            {item.lead && <dd className="scope-lead">{item.lead}</dd>}
            <dd className="scope-detail">{item.detail}</dd>
          </GlowEdge>
        ))}
      </dl>
    </section>
  )
}
