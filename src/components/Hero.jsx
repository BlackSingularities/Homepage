import ParticlesBg from './Particles'

export default function Hero() {
  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero">
      <ParticlesBg />

      <div className="container hero-content">
        <p className="hero-eyebrow">Portfolio &amp; Studio</p>

        <h1 className="hero-name">
          Adam
          <span className="gradient-line">Rędzikowski</span>
        </h1>

        <div className="hero-divider" />

        <p className="hero-roles">
          Web Designer
          <span>·</span>
          Grafik
          <span>·</span>
          Fotograf
          <span>·</span>
          Developer
        </p>

        <div className="hero-ctas">
          <button className="btn-gold" onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Zobacz portfolio
          </button>
          <button className="btn-ghost" onClick={scrollToAbout}>
            O mnie
          </button>
        </div>
      </div>

      <div className="hero-scroll" onClick={scrollToAbout} title="Przewiń w dół">
        <div className="scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  )
}
