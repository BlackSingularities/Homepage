import { useEffect, useRef } from 'react'

export default function About() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal')
    if (!els) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <section id="about" ref={sectionRef}>
      <div className="container">
        <div className="about-grid">

          <div className="about-photo-wrap reveal">
            <div className="about-photo-inner">
              <img src="/assets/adam.jpg" alt="Adam Rędzikowski" loading="lazy" />
              <div className="about-photo-frame" />
            </div>
            <div className="about-photo-badge">
              <div className="num">5+</div>
              <div className="lbl">Lat<br/>doświadczenia</div>
            </div>
          </div>

          <div className="about-text">
            <p className="section-label reveal">O mnie</p>
            <h2 className="section-heading reveal reveal-delay-1">
              Tworzę rzeczy,<br/><em>które działają</em>
            </h2>

            <blockquote className="about-highlight reveal reveal-delay-2">
              Łączę estetykę z funkcjonalnością — każdy projekt traktuję jak produkt, który ma osiągać cele.
            </blockquote>

            <div className="about-bio reveal reveal-delay-2">
              <p>
                Jestem web designerem, grafikiem i fotografem z Poznania. Projektuję i programuję aplikacje webowe —
                od identyfikacji wizualnej po pełny stack technologiczny.
              </p>
              <p>
                Pracuję z firmami i osobami prywatnymi, które chcą mieć stronę lub aplikację dopracowaną
                w każdym detalu — nie tylko ładną, ale przede wszystkim skuteczną.
              </p>
            </div>

            <div className="about-stats reveal reveal-delay-3">
              <div className="about-stat">
                <div className="num gold-text">15+</div>
                <div className="lbl">Projektów</div>
              </div>
              <div className="about-stat">
                <div className="num gold-text">5+</div>
                <div className="lbl">Lat w branży</div>
              </div>
              <div className="about-stat">
                <div className="num gold-text">100%</div>
                <div className="lbl">Zaangażowania</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
