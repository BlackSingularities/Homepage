import SectionHead from './SectionHead'

/** Proces to prawdziwa kolejność, więc tu – i tylko tu – kroki mają numery. */
export default function Process({ data }) {
  return (
    <section className="section rail" id="proces">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <ol className="proc-list">
        {(data.items || []).map(step => (
          <li className="proc-step" key={step.no}>
            <span className="proc-no">{step.no}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
