import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react'
import { Counter, KineticText, ease, useTilt } from '../lib/ui'

function Showreel({ projects }) {
  const tilt = useTilt(6)
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const shots = projects
    .filter(project => project.slides?.length)
    .map(project => ({ src: project.slides[0], name: project.name, href: project.href, label: project.label }))

  useEffect(() => {
    if (reduce || shots.length < 2) return undefined
    const timer = setInterval(() => setIndex(current => (current + 1) % shots.length), 3800)
    return () => clearInterval(timer)
  }, [shots.length, reduce])

  if (!shots.length) return null
  const shot = shots[index % shots.length]
  const host = shot.href.startsWith('http') ? shot.href.replace(/^https?:\/\//, '') : `redzikowski.com${shot.href}`

  return (
    <div className="showreel" ref={tilt}>
      <div className="showreel-frame">
        <div className="window-bar">
          <i /><i /><i />
          <span>{host}</span>
          <ArrowUpRight size={14} />
        </div>
        <div className="showreel-stage">
          {shots.map((item, position) => (
            <img
              key={item.src}
              src={item.src}
              alt={`${item.name} — podgląd`}
              className={position === index % shots.length ? 'is-active' : ''}
              loading={position === 0 ? 'eager' : 'lazy'}
            />
          ))}
          <div className="showreel-scan" />
        </div>
      </div>

      <div className="showreel-tag">
        <span>Aktualnie na ekranie</span>
        <b>{shot.name}</b>
        <i>{shot.label}</i>
      </div>

      <div className="showreel-dots">
        {shots.map((item, dot) => (
          <button
            key={item.src}
            className={dot === index % shots.length ? 'is-active' : ''}
            onClick={() => setIndex(dot)}
            aria-label={`Pokaż ${item.name}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function Hero({ hero, projects }) {
  return (
    <section className="hero" id="start">
      <div className="hero-aura" aria-hidden="true"><i /><i /><i /></div>

      <div className="hero-inner">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badges">
            <span className="pill pill-live"><i />{hero.availability}</span>
            <span className="pill">{hero.badge}</span>
          </div>

          <h1 className="hero-title">
            <KineticText text={hero.titleTop} accent={hero.titleAccent} />
          </h1>

          <motion.p
            className="hero-lead"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease }}
          >
            {hero.lead}
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease }}
          >
            <a className="btn btn-primary" href="#kontakt">{hero.primaryCta} <ArrowRight size={17} /></a>
            <a className="btn btn-ghost" href="#realizacje">{hero.secondaryCta}</a>
            <a className="hero-estimate" href="#wycena"><Sparkles size={15} /> Policz orientacyjny koszt</a>
          </motion.div>

          <motion.dl
            className="hero-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.6 }}
          >
            {hero.stats.map(stat => (
              <div key={stat.label}>
                <dt><Counter value={stat.value} suffix={stat.suffix || ''} /></dt>
                <dd>{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease }}
        >
          <Showreel projects={projects} />
        </motion.div>
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map(copy => (
            <div className="marquee-group" key={copy}>
              {hero.marquee.map(word => <span key={`${copy}-${word}`}>{word}<i>◆</i></span>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
