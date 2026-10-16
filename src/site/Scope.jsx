import SectionHead from './SectionHead'

/**
 * Zakres jako lista definicji, nie siatka kart: nazwa obszaru z hasłem,
 * pod nią to, co się pod nim naprawdę robi. Pozycje nie są numerowane,
 * bo nie tworzą kolejności – można zamówić dowolną.
 */
export default function Scope({ data }) {
  return (
    <section className="section rail" id="zakres">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <dl className="scope-list">
        {(data.items || []).map(item => (
          <div className="scope-item" key={item.id || item.title}>
            <dt>{item.title}</dt>
            {item.lead && <dd className="scope-lead">{item.lead}</dd>}
            <dd>{item.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
