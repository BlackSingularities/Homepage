import Heading from './Heading'
function Paragraphs({ text }) {
  return String(text || '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={index}>{paragraph}</p>)
}

/**
 * „O mnie” w układzie rejestru: po lewej tytuł i podpis, po prawej tekst.
 * Kompetencje to zwykła lista bez numerów – nie mają kolejności.
 */
export default function About({ data, brand }) {
  return (
    <section className="section rail about" id="o-mnie">
      <header className="section-head">
        <h2><Heading title={data.title} accent={data.accent} /></h2>
        <div className="about-sign">
          <img src="/assets/brand/logo-ar-web.png" alt="" />
          <span>{brand.name}<i>{brand.location}</i></span>
        </div>
      </header>

      <div className="about-body">
        <p className="about-lead">{data.lead}</p>
        <div className="about-copy"><Paragraphs text={data.text} /></div>
      </div>

      {/* Kompetencje zamykają sekcję na całą szerokość, pod obiema kolumnami. */}
      {(data.strengths || []).length > 0 && (
        <ul className="about-strengths">
          {data.strengths.map(strength => <li key={strength}>{strength}</li>)}
        </ul>
      )}
    </section>
  )
}
