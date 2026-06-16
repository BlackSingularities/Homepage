import { useEffect, useRef } from 'react'

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

const ExtIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

const PROJECTS = [
  {
    title: 'Kompendium Podróżnicze',
    type: 'Aplikacja webowa',
    desc: 'Rozbudowana encyklopedia podróżnicza — kraje, miasta, atrakcje, blog. FastAPI + React, 21 tabel bazy danych, panel admina, bogata baza wiedzy o świecie.',
    tags: ['FastAPI', 'React', 'SQLite', 'Docker'],
    gradient: 'linear-gradient(135deg, #1a2744 0%, #0d1a38 40%, #091428 100%)',
    label: 'Kompendium',
    href: '/kompendium-podroznicze',
    badge: 'Własny projekt',
    size: 'featured',
  },
  {
    title: 'Navigator',
    type: 'Eksplorator tras GPX',
    desc: 'Aplikacja do zarządzania i analizy tras GPX. Mapa Leaflet, wykresy wysokości, heatmapa, duplikaty, statystyki archiwum 300+ tras.',
    tags: ['Node.js', 'Leaflet', 'Docker'],
    gradient: 'linear-gradient(135deg, #1a2a1a 0%, #0d200d 40%, #081408 100%)',
    label: 'Navigator',
    href: '/navigator',
    badge: 'Własny projekt',
    size: 'regular',
  },
  {
    title: 'Travels 2.0',
    type: 'Dziennik podróży',
    desc: 'Aplikacja do dokumentowania podróży z galerią zdjęć, mapami i wpisami. FastAPI + React + Tailwind.',
    tags: ['FastAPI', 'React', 'Tailwind', 'Docker'],
    gradient: 'linear-gradient(135deg, #2a1a10 0%, #1a0d06 40%, #0d0804 100%)',
    label: 'Travels',
    href: '/travels',
    badge: 'Własny projekt',
    size: 'half',
  },
  {
    title: 'ProjectTravel.pl',
    type: 'Strona dla klienta',
    desc: 'Profesjonalna strona internetowa wykonana na zlecenie. Projekt, kodowanie i wdrożenie.',
    tags: ['Web Design', 'Frontend', 'Wdrożenie'],
    gradient: 'linear-gradient(135deg, #2a2a1a 0%, #1a1a0d 40%, #0e0e08 100%)',
    label: 'ProjectTravel',
    href: 'https://www.projecttravel.pl/',
    badge: 'Klient',
    external: true,
    size: 'half',
  },
]

function ProjectCard({ project }) {
  const sizeClass = {
    featured: 'project-card--featured',
    regular:  'project-card--regular',
    half:     'project-card--half',
  }[project.size]

  return (
    <article className={`project-card ${sizeClass} reveal`}>
      <div className="project-visual">
        <div className="project-visual-inner">
          <div className="project-visual-grad" style={{ background: project.gradient }} />
          <span className="project-visual-label">{project.label}</span>
        </div>
        <span className="project-visual-badge">{project.badge}</span>
      </div>

      <div className="project-body">
        <p className="project-type">{project.type}</p>
        <h3 className="project-title">{project.title}</h3>
        <p className="project-desc">{project.desc}</p>

        <div className="project-footer">
          <div className="project-tags">
            {project.tags.map(t => <span key={t} className="project-tag">{t}</span>)}
          </div>
          <a
            href={project.href}
            className="project-link"
            target={project.external ? '_blank' : '_self'}
            rel={project.external ? 'noopener noreferrer' : undefined}
          >
            {project.external ? 'Odwiedź' : 'Otwórz'}
            {project.external ? <ExtIcon /> : <ArrowIcon />}
          </a>
        </div>
      </div>
    </article>
  )
}

export default function Portfolio() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal')
    if (!els) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.08 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <section id="portfolio" ref={sectionRef}>
      <div className="container">
        <div className="portfolio-header">
          <div>
            <p className="section-label reveal">Portfolio</p>
            <h2 className="section-heading reveal reveal-delay-1">
              Wybrane<br/><em>realizacje</em>
            </h2>
          </div>
          <a href="mailto:redzikowskia@gmail.com" className="btn-ghost reveal reveal-delay-2">
            Zapytaj o projekt
          </a>
        </div>

        <div className="portfolio-grid">
          {PROJECTS.map(p => <ProjectCard key={p.title} project={p} />)}
        </div>
      </div>
    </section>
  )
}
