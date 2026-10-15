import { Reveal } from '../lib/ui'

/**
 * Nagłówek sekcji: tytuł, wprowadzenie i — gdy jest czym — licznik pozycji.
 * Licznik stoi przy wprowadzeniu, bo mówi, ile rzeczy czeka niżej.
 */
export default function SectionHead({ id, title, accent, lead, count, action }) {
  return (
    <Reveal className="section-head" id={id}>
      <h2>
        {title}
        {accent && <> <em className="accent">{accent}</em></>}
      </h2>
      <div>
        {lead && <p className="section-head-lead">{lead}</p>}
        {count && <span className="section-head-count">{count}</span>}
        {action}
      </div>
    </Reveal>
  )
}
