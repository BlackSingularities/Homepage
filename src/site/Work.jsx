import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, GitBranch, Terminal } from 'lucide-react'
import { Reveal, ease, useTilt } from '../lib/ui'
import SectionHead from './SectionHead'

export default function Work({ data }) {
  const projects = (data.items || []).filter(item => item.hidden !== true)
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
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />

      <Reveal className="work-tabs" amount={0.2} role="tablist" aria-label="Wybierz realizację">
        {projects.map((item, index) => (
          <button
            key={item.id || item.name}
            className={index === active ? 'is-active' : ''}
            onClick={() => setActive(index)}
            role="tab"
            aria-selected={index === active}
          >
            <span className="work-tab-preview">
              {item.slides?.[0] && <img src={item.slides[0]} alt="" loading="lazy" />}
            </span>
            <span className="work-tab-copy">
              <b>{item.name}</b>
              <small>{item.label}</small>
            </span>
          </button>
        ))}
      </Reveal>

      <motion.div
        className="work-stage"
        id="realizacja-podglad"
        key={project.id || project.name}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <header className="work-case-head">
          <div>
            <h3>{project.name}</h3>
          </div>
          <p className="work-statement">{project.statement}</p>
        </header>

        <div className="work-case-meta" aria-label="Charakter projektu">
          <span>{project.label}</span>
          <i />
          <span>Projekt i wykonanie od zera</span>
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
            <div className="window-controls" aria-hidden="true"><i /><i /><i /></div>
            <span className="window-path"><Terminal size={12} /> {address}</span>
            <span className="window-branch"><GitBranch size={11} /> production</span>
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

        <footer className="work-case-foot">
          <div className="work-description">
            <span>O produkcie</span>
            <p>{project.description}</p>
          </div>
          <div className="work-scope">
            <span>Zakres realizacji</span>
            <ul className="work-features">
              {(project.features || []).map(feature => <li key={feature}><Check size={13} />{feature}</li>)}
            </ul>
          </div>
          <a className="work-open" href={project.href} target={external ? '_blank' : undefined} rel="noreferrer">
            <span>Zobacz działający produkt</span>
            <i>{address}</i>
            <ArrowUpRight size={18} />
          </a>
        </footer>
      </motion.div>
    </section>
  )
}
