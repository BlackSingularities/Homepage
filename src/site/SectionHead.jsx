/**
 * Nagłówek sekcji: tytuł, wprowadzenie i – gdy jest czym – licznik pozycji.
 * W układzie rejestru stoi w lewej kolumnie i trzyma się góry ekranu.
 */
export default function SectionHead({ id, title, accent, lead, count, action }) {
  return (
    <header className="section-head" id={id}>
      <h2>{title}{accent && <> {accent}</>}</h2>
      {lead && <p className="section-head-lead">{lead}</p>}
      {count && <span className="section-head-count">{count}</span>}
      {action}
    </header>
  )
}
