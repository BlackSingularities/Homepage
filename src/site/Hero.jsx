import Heading from './Heading'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { CATALOG_PATH } from '../lib/projects'
import { useT } from '../lib/i18n'
import GlowEdge from '../lib/GlowEdge'

/**
 * Pierwszy ekran to od razu indeks prac. Zdanie o tym, co robię, stoi nad
 * nim krótko, a pod spodem jest karuzela plakatów wybranych aplikacji –
 * tylko tych zaznaczonych w panelu i tylko tych, które mają plakat
 * w repozytorium. Plakat prowadzi do strony pracy w portfolio.
 *
 * Karuzela rusza się wyłącznie na gest czytelnika (palec, gładzik, strzałki),
 * nic nie przewija się samo.
 */
export default function Hero({ hero, labels, featured = [], total = 0, onNavigate }) {
  const { t, lp } = useT()
  const catalog = lp(CATALOG_PATH)
  // Jedna karta na aplikację: pierwszy plakat z manifestu repozytorium.
  const cards = featured
    .filter(project => project.posters?.length)
    .map(project => ({ project, poster: project.posters[0] }))
  const rest = total - cards.length
  const rail = useRef(null)
  const [edges, setEdges] = useState({ prev: false, next: false })

  const measure = useCallback(() => {
    const el = rail.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ prev: el.scrollLeft > 4, next: el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, cards.length])

  // Strzałka przesuwa o tyle kart, ile mieści się w kadrze (co najmniej jedną).
  const step = direction => {
    const el = rail.current
    const card = el?.querySelector('li')
    if (!el || !card) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    const size = card.offsetWidth + gap
    const visible = Math.max(1, Math.floor((el.clientWidth + gap) / size) - 1)
    el.scrollBy({ left: direction * size * visible, behavior: 'smooth' })
  }

  // Wejście robi CSS (.rise), więc treść jest widoczna nawet bez JS-owej animacji.
  const enter = delay => ({ style: { '--rise-delay': `${delay}s` } })

  const open = (event, href) => { event.preventDefault(); onNavigate(href) }

  return (
    <section className="hero" id="start">
      <div className="hero-top">
        <h1 className="hero-title rise" {...enter(0.05)}>
          <span className="hero-title-lead">{hero.titleTop}</span> {hero.titleAccent}
        </h1>
        <div className="hero-side rise" {...enter(0.2)}>
          <p>{hero.lead}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#kontakt">{hero.primaryCta}</a>
            <a className="hero-link" href={catalog} onClick={event => open(event, catalog)}>
              {hero.secondaryCta}
            </a>
          </div>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="works rise" id="portfolio" {...enter(0.35)}>
          <div className="works-head">
            <h2><Heading title={labels.title} accent={labels.accent} /></h2>
            {cards.length > 1 && (
              <div className="works-nav">
                <button type="button" onClick={() => step(-1)} disabled={!edges.prev} aria-label={t('works.prev')}><ArrowLeft size={18} /></button>
                <button type="button" onClick={() => step(1)} disabled={!edges.next} aria-label={t('works.next')}><ArrowRight size={18} /></button>
              </div>
            )}
          </div>

          <ul className={`works-rail ${cards.length < 4 ? 'is-few' : ''}`} ref={rail} onScroll={measure}>
            {cards.map(({ project, poster }, index) => {
              const href = lp(`${CATALOG_PATH}/${project.slug}`)
              return (
                <li key={project.id}>
                  {/* Ta sama świecąca krawędź za kursorem co na kafelkach oferty. */}
                  <GlowEdge as="a" media href={href} onClick={event => open(event, href)} aria-label={t('works.open', project.name)}>
                    <img src={poster.src} alt={poster.alt || project.name} width="1080" height="1920" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
                  </GlowEdge>
                </li>
              )
            })}
          </ul>

          {rest > 0 && (
            <a className="works-more" href={catalog} onClick={event => open(event, catalog)}>
              {t('hero.more', labels.catalogCta, rest)}
            </a>
          )}
        </div>
      )}
    </section>
  )
}
