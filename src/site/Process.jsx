import Heading from './Heading'

/**
 * Kroki współpracy to jedyna prawdziwa kolejność na stronie, więc stoją
 * na wspólnej osi: jedna linia, na niej punkty, a pod każdym to, co się
 * wtedy dzieje. Numery mają tu sens – pokazują, w którym miejscu drogi
 * jest czytelnik. Sekcja idzie przez całą szerokość, żeby nie powtarzać
 * układu zakresu, który stoi tuż nad nią.
 */
export default function Process({ data }) {
  return (
    <section className="section proc" id="proces">
      <header className="proc-head">
        <h2><Heading title={data.title} accent={data.accent} /></h2>
        {data.lead && <p>{data.lead}</p>}
      </header>

      <ol className="proc-track">
        {(data.items || []).map((step, index) => (
          <li className="proc-step" key={step.no || step.title}>
            <span className="proc-no mono">{step.no || String(index + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
