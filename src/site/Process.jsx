import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Reveal } from '../lib/ui'
import SectionHead from './SectionHead'

export default function Process({ data }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.7'] })
  const line = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 })

  return (
    <section className="section process" id="proces">
      <SectionHead kicker={data.kicker} title={data.title} accent={data.accent} lead={data.lead} index="005" />
      <div className="proc-track" ref={ref}>
        <div className="proc-line" aria-hidden="true"><motion.i style={{ scaleX: line }} /></div>
        <div className="proc-steps">
          {(data.items || []).map((step, index) => (
            <Reveal className="proc-step" key={step.no} delay={index * 0.09} amount={0.4}>
              <span className="proc-dot" aria-hidden="true" />
              <span className="proc-no">{step.no}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
