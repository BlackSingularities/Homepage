import { Reveal } from '../lib/ui'

export default function About({ data, brand }) {
  return (
    <section className="section about" id="o-mnie">
      <div className="about-body">
        <div className="section-kicker"><span>{data.kicker}</span><span className="section-index">007</span></div>
        <div className="about-content">
          <Reveal as="h2" className="about-title">{data.title} <em className="accent">{data.accent}</em></Reveal>
          <div className="about-copy">
            <Reveal as="p" className="about-lead" delay={0.06}>{data.lead}</Reveal>
            <Reveal as="p" className="about-text" delay={0.1}>{data.text}</Reveal>
            <Reveal className="about-sign" delay={0.18}>
              <b>{brand.initials}</b>
              <span>{brand.tagline}<i>{brand.location}</i></span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
