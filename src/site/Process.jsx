import SectionHead from './SectionHead'

/**
 * Kroki procesu: nazwa po lewej, opis po prawej. Kolejność niesie sama
 * lista (`ol`), więc numery nie są potrzebne na ekranie.
 */
export default function Process({ data }) {
  return (
    <section className="section rail" id="proces">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <ol className="proc-list">
        {(data.items || []).map(step => (
          <li className="proc-step" key={step.no}>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
