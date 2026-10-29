import Heading from './Heading'
import { useState } from 'react'
import { CATALOG_PATH } from '../lib/projects'
import { useT } from '../lib/i18n'
import GlowEdge from '../lib/GlowEdge'

/**
 * Pierwszy ekran to od razu indeks prac. Zdanie o tym, co robię, stoi nad
 * nim krótko – dowodem są nazwy realizacji, a podgląd po prawej pokazuje
 * tę, na której właśnie jest kursor albo fokus klawiatury.
 *
 * To jedyne miejsce na stronie, które się porusza bez udziału czytelnika:
 * jedno wejście przy załadowaniu, nic przy przewijaniu.
 */
export default function Hero({ hero, labels, featured = [], total = 0, onNavigate }) {
  const { t, lp } = useT()
  const [current, setCurrent] = useState(0)
  const catalog = lp(CATALOG_PATH)
  const rest = total - featured.length

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

      {featured.length > 0 && (
        <div className="works rise" id="portfolio" {...enter(0.35)}>
          <div className="works-head">
            <h2><Heading title={labels.title} accent={labels.accent} /></h2>
          </div>

          <div className="works-body">
            <ol className="works-list">
              {featured.map((project, index) => {
                const href = lp(`${CATALOG_PATH}/${project.slug}`)
                return (
                  <li key={project.id}>
                    <a
                      href={href}
                      className={index === current ? 'is-current' : ''}
                      onMouseEnter={() => setCurrent(index)}
                      onFocus={() => setCurrent(index)}
                      onClick={event => open(event, href)}
                    >
                      <strong>
                        {project.icon && <img className="works-icon" src={project.icon} alt="" loading="lazy" />}
                        {project.name}
                      </strong>
                      <span className="works-meta">
                        <span>{project.label || t(`kind.${project.kind}`)}</span>
                        {project.year && <span>{project.year}</span>}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>

            <figure className="works-preview" aria-hidden="true">
              <GlowEdge media className="works-frame">
                {featured.map((project, index) => (
                  project.thumb || project.cover
                    ? <img key={project.id} src={project.thumb || project.cover} alt="" className={index === current ? 'is-current' : ''} loading={index === 0 ? 'eager' : 'lazy'} />
                    : <i key={project.id} className={index === current ? 'is-current' : ''}>{project.name}</i>
                ))}
              </GlowEdge>
              {/* Wszystkie podpisy leżą w jednej komórce siatki, więc jej wysokość
                  wyznacza najdłuższy z nich i podgląd nie skacze przy przełączaniu. */}
              {featured.map((project, index) => (
                <figcaption key={project.id} className={index === current ? 'is-current' : ''}>{project.tagline}</figcaption>
              ))}
            </figure>
          </div>

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
