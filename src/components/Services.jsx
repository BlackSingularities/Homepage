import { useEffect, useRef } from 'react'

const SERVICES = [
  {
    num: '01',
    title: 'Web Design',
    desc: 'Projektuję interfejsy, które przyciągają wzrok i prowadzą użytkownika do celu. UX/UI, prototypy, design systemy — od koncepcji do gotowego projektu.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Aplikacje Webowe',
    desc: 'Buduję pełne aplikacje webowe — od backendu (Python, Node.js) po frontend (React). Bazy danych, REST API, Docker, CI/CD — kompleksowo.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Identyfikacja Wizualna',
    desc: 'Tworzę logo, branding i materiały graficzne, które budują spójny wizerunek marki. Projekty do druku, social media, prezentacje.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Fotografia',
    desc: 'Fotografia komercyjna, portretowa i krajobrazowa. Zdjęcia produktowe, sesje wizerunkowe, obróbka i retusz — gotowe do użycia od razu.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
]

export default function Services() {
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
    <section id="services" ref={sectionRef}>
      <div className="container">
        <div className="services-header">
          <p className="section-label reveal">Usługi</p>
          <h2 className="section-heading reveal reveal-delay-1">
            Co mogę<br/><em>dla Ciebie zrobić</em>
          </h2>
        </div>

        <div className="services-grid reveal reveal-delay-2">
          {SERVICES.map((s) => (
            <div key={s.num} className="service-card">
              <span className="service-number">{s.num}</span>
              <div className="service-icon">{s.icon}</div>
              <h3 className="service-title">{s.title}</h3>
              <p className="service-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
