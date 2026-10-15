import { Reveal } from '../lib/ui'

function Paragraphs({ text }) {
  return String(text || '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={index}>{paragraph}</p>)
}

/**
 * „O mnie” wchłonęło dawny manifest — jedna sekcja zamiast dwóch mówiących to
 * samo. Lista kompetencji nie jest numerowana, bo nie ma w niej kolejności.
 */
export default function About({ data, brand }) {
  return (
    <section className="section about" id="o-mnie">
      <Reveal as="h2" className="about-title">
        {data.title} <em className="accent">{data.accent}</em>
      </Reveal>

      <div className="about-grid">
        <Reveal className="about-copy" delay={0.06}>
          <p className="about-lead">{data.lead}</p>
          <Paragraphs text={data.text} />
        </Reveal>

        <Reveal className="about-side" delay={0.12}>
          <ul className="about-strengths">
            {(data.strengths || []).map(strength => <li key={strength}>{strength}</li>)}
          </ul>
          <div className="about-sign">
            <img src="/assets/brand/logo-ar-web.png" alt="" />
            <span>{brand.tagline}<i>{brand.location}</i></span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
