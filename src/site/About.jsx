import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Reveal } from '../lib/ui'

export default function About({ data, brand }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])

  return (
    <section className="section about" id="o-mnie" ref={ref}>
      <Reveal className="about-frame">
        <motion.img src={data.image} alt={brand.name} style={{ y }} loading="lazy" />
        <span className="about-caption">{data.caption}</span>
      </Reveal>

      <div className="about-body">
        <div className="section-kicker"><span>{data.kicker}</span><span className="section-index">007</span></div>
        <Reveal as="h2" className="about-title">{data.title} <em className="accent">{data.accent}</em></Reveal>
        <Reveal as="p" className="about-lead" delay={0.06}>{data.lead}</Reveal>
        <Reveal as="p" className="about-text" delay={0.1}>{data.text}</Reveal>
        <Reveal className="about-sign" delay={0.18}>
          <b>{brand.initials}</b>
          <span>{brand.tagline}<i>{brand.location}</i></span>
        </Reveal>
      </div>
    </section>
  )
}
