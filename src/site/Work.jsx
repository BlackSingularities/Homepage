import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Reveal, ease, useTilt } from '../lib/ui'
import SectionHead from './SectionHead'

export default function Work({ data }) {
  const projects = data.items || []
  const [active, setActive] = useState(0)
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  const tilt = useTilt(4)
  const dragFrom = useRef(0)

  const project = projects[Math.min(active, projects.length - 1)]
  const slides = project?.slides?.length ? project.slides : []

  useEffect(() => setSlide(0), [active])

  useEffect(() => {
    if (reduce || paused || slides.length < 2) return undefined
    const timer = setInterval(() => setSlide(current => (current + 1) % slides.length), 4200)
    return () => clearInterval(timer)
  }, [slides.length, paused, reduce, active])

  if (!project) return null

  const step = direction => setSlide(current => (current + direction + slides.length) % slides.length)
  const external = project.href.startsWith('http')
  const address = external ? project.href.replace(/^https?:\/\//, '') : `redzikowski.com${project.href}`

  return (
    <section className="section work" id="realizacje">
      <SectionHead kicker={data.kicker} title={data.title} accent={data.accent} lead={data.lead} index="004" />

      <Reveal className="work-tabs" amount={0.2}>
        {projects.map((item, index) => (
          <button
            key={item.id || item.name}
            className={index === active ? 'is-active' : ''}
            onClick={() => setActive(index)}
          >
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{item.name}</span>
          </button>
        ))}
      </Reveal>

      <motion.div
        className="work-stage"
        key={project.id || project.name}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <div className="work-copy">
          <span className="work-label">{project.label}</span>
          <h3>{project.name}</h3>
          <p className="work-statement">{project.statement}</p>
          <p className="work-description">{project.description}</p>
          <ul className="work-features">
            {(project.features || []).map(feature => <li key={feature}><Check size={13} />{feature}</li>)}
          </ul>
          <a className="work-open" href={project.href} target={external ? '_blank' : undefined} rel="noreferrer">
            <span>Otwórz projekt</span>
            <i>{address}</i>
            <ArrowUpRight size={18} />
          </a>
        </div>

        <div
          className="work-viewport"
          ref={tilt}
          tabIndex={0}
          role="group"
          aria-label={`Ekrany projektu ${project.name}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
            if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
          }}
          onPointerDown={event => { dragFrom.current = event.clientX }}
          onPointerUp={event => {
            const distance = event.clientX - dragFrom.current
            if (Math.abs(distance) > 45) step(distance > 0 ? -1 : 1)
            dragFrom.current = 0
          }}
        >
          <div className="window-bar">
            <i /><i /><i />
            <span>{address}</span>
          </div>
          <div className="work-screens">
            {slides.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`${project.name} — ekran ${index + 1}`}
                className={index === slide ? 'is-active' : ''}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
          {slides.length > 1 && (
            <div className="work-controls">
              <button onClick={() => step(-1)} aria-label="Poprzedni ekran"><ChevronLeft size={16} /></button>
              <div className="work-bars">
                {slides.map((src, index) => (
                  <button
                    key={src}
                    className={index === slide ? 'is-active' : ''}
                    onClick={() => setSlide(index)}
                    aria-label={`Ekran ${index + 1}`}
                  >
                    <i style={{ animationPlayState: paused || reduce ? 'paused' : 'running' }} />
                  </button>
                ))}
              </div>
              <button onClick={() => step(1)} aria-label="Następny ekran"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  )
}
