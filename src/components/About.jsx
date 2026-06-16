import { useEffect, useRef } from 'react'

function useCountUp(ref, target, duration = 1800) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start = null
    let running = false

    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      el.textContent = Math.floor(ease * target) + (el.dataset.suffix || '')
      if (progress < 1) requestAnimationFrame(step)
    }

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true
        requestAnimationFrame(step)
        obs.disconnect()
      }
    }, { threshold: 0.5 })

    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])
}

function Counter({ value, suffix, label }) {
  const ref = useRef(null)
  useCountUp(ref, value)

  return (
    <div className="about-stat">
      <div
        className="num gold-text"
        ref={ref}
        data-suffix={suffix}
      >
        0{suffix}
      </div>
      <div className="lbl">{label}</div>
    </div>
  )
}

export default function About() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal')
    if (!els) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
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

            {/* Floating accent image */}
            <div className="about-accent-img">
              <img
                src="https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80&auto=format&fit=crop"
                alt=""
                loading="lazy"
              />
              <div className="about-accent-overlay" />
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
                Jestem web designerem, grafikiem i fotografem z Poznania. Projektuję i programuję
                aplikacje webowe — od identyfikacji wizualnej po pełny stack technologiczny.
              </p>
              <p>
                Pracuję z firmami i osobami prywatnymi, które chcą mieć stronę lub aplikację
                dopracowaną w każdym detalu — nie tylko ładną, ale przede wszystkim skuteczną.
              </p>
            </div>

            <div className="about-stats reveal reveal-delay-3">
              <Counter value={15} suffix="+" label="Projektów" />
              <Counter value={5}  suffix="+" label="Lat w branży" />
              <Counter value={100} suffix="%" label="Zaangażowania" />
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
