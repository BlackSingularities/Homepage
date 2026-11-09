import Heading from './Heading'
/**
 * Nagłówek sekcji: tytuł, wprowadzenie i – gdy jest czym – licznik pozycji.
 * W układzie rejestru stoi w lewej kolumnie i trzyma się góry ekranu.
 */
export default function SectionHead({ id, title, accent, lead, count, action, level = 'h2' }) {
  const Tag = level
  return (
    <header className="section-head" id={id}>
      <Tag><Heading title={title} accent={accent} /></Tag>
      {lead && <p className="section-head-lead">{lead}</p>}
      {count && <span className="section-head-count">{count}</span>}
      {action}
    </header>
  )
}
