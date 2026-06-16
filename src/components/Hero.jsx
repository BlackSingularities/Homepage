import { useEffect, useRef } from 'react'
import ParticlesBg from './Particles'

const BG = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80&auto=format&fit=crop'

export default function Hero() {
  const lineRef = useRef(null)

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="hero">
      {/* Background image */}
      <div
        className="hero-bg-img"
        style={{ backgroundImage: `url(${BG})` }}
        aria-hidden="true"
      />
      {/* Gradient overlays */}
      <div className="hero-overlay-1" aria-hidden="true" />
      <div className="hero-overlay-2" aria-hidden="true" />

      <ParticlesBg />

      <div className="container hero-content">
        <p className="hero-eyebrow">
          <span className="hero-eyebrow-line" />
          Adam Rędzikowski Studio
          <span className="hero-eyebrow-line" />
        </p>

        <h1 className="hero-name">
          <span className="hero-name-line-1">Adam</span>
          <span className="hero-name-line-2 gradient-line">Rędzikowski</span>
        </h1>

        <div className="hero-divider" ref={lineRef} />

        <p className="hero-roles">
          Web Designer
          <span className="role-sep">·</span>
          Grafik
          <span className="role-sep">·</span>
          Fotograf
          <span className="role-sep">·</span>
          Developer
        </p>

        <div className="hero-ctas">
          <button
            className="btn-gold"
            onClick={() => scrollTo('portfolio')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Zobacz portfolio
          </button>
          <button className="btn-ghost" onClick={() => scrollTo('contact')}>
            Napisz do mnie
          </button>
        </div>
      </div>

      <div className="hero-scroll" onClick={() => scrollTo('about')}>
        <div className="scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  )
}
