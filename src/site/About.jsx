import { Reveal } from '../lib/ui'
import TextBreak from './TextBreak'

export default function About({ data, brand }) {
  return (
    <section className="section about" id="o-mnie">
      <div className="about-body">
        <div className="about-content">
          <div className="about-intro">
            <Reveal as="h2" className="about-title">
              {data.title}{' '}
              <em className="accent"><TextBreak text={data.accent} before="po wdrożeniu." /></em>
            </Reveal>
            <Reveal className="about-visual" delay={0.08} y={18}>
              <img
                src="/assets/brand/about-system-web.png"
                alt="Połączone warstwy indywidualnego systemu: dane, interfejs, CMS, automatyzacja i infrastruktura"
                loading="lazy"
              />
            </Reveal>
          </div>
          <div className="about-copy">
            <Reveal as="p" className="about-lead" delay={0.06}>{data.lead}</Reveal>
            <Reveal as="p" className="about-text" delay={0.1}>{data.text}</Reveal>
            <Reveal as="ul" className="about-strengths" delay={0.14}>
              {(data.strengths || []).map((strength, index) => (
                <li key={strength}><span>{String(index + 1).padStart(2, '0')}</span>{strength}</li>
              ))}
            </Reveal>
            <Reveal className="about-sign" delay={0.18}>
              <img src="/assets/brand/logo-ar-web.png" alt="" />
              <span>{brand.tagline}<i>{brand.location}</i></span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
