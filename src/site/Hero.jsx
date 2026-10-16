import { useState } from 'react'
import { CATALOG_PATH, KIND_LABEL, plural } from '../lib/projects'

/**
 * Pierwszy ekran to od razu indeks prac. Zdanie o tym, co robię, stoi nad
 * nim krótko — dowodem są nazwy realizacji, a podgląd po prawej pokazuje
 * tę, na której właśnie jest kursor albo fokus klawiatury.
 *
 * To jedyne miejsce na stronie, które się porusza bez udziału czytelnika:
 * jedno wejście przy załadowaniu, nic przy przewijaniu.
 */
export default function Hero({ hero, labels, featured = [], total = 0, onNavigate }) {
  const [current, setCurrent] = useState(0)
  const shown = featured[current] || featured[0]
  const rest = total - featured.length

  // Wejście robi CSS (.rise), więc treść jest widoczna nawet bez JS-owej animacji.
  const enter = delay => ({ style: { '--rise-delay': `${delay}s` } })

  const open = (event, href) => { event.preventDefault(); onNavigate(href) }

  return (
    <section className="hero" id="start">
      <div className="hero-top">
        <h1 className="hero-title rise" {...enter(0.05)}>
          {hero.titleTop} {hero.titleAccent}
        </h1>
        <div className="hero-side rise" {...enter(0.2)}>
          <p>{hero.lead}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#kontakt">{hero.primaryCta}</a>
            <a className="hero-link" href={CATALOG_PATH} onClick={event => open(event, CATALOG_PATH)}>
              {hero.secondaryCta}
            </a>
          </div>
        </div>
      </div>

      {featured.length > 0 && (
        <div className="works rise" id="portfolio" {...enter(0.35)}>
          <div className="works-head">
            <h2>{labels.title} {labels.accent}</h2>
            <span>{total} {plural(total, 'realizacja', 'realizacje', 'realizacji')}</span>
          </div>

          <div className="works-body">
            <ol className="works-list">
              {featured.map((project, index) => {
                const href = `${CATALOG_PATH}/${project.slug}`
                return (
                  <li key={project.id}>
                    <a
                      href={href}
                      className={index === current ? 'is-current' : ''}
                      onMouseEnter={() => setCurrent(index)}
                      onFocus={() => setCurrent(index)}
                      onClick={event => open(event, href)}
                    >
                      <strong>{project.name}</strong>
                      <span className="works-meta">
                        <span>{project.label || KIND_LABEL[project.kind]}</span>
                        {project.year && <span>{project.year}</span>}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>

            <figure className="works-preview" aria-hidden="true">
              {featured.map((project, index) => (
                project.cover
                  ? <img key={project.id} src={project.cover} alt="" className={index === current ? 'is-current' : ''} loading={index === 0 ? 'eager' : 'lazy'} />
                  : <i key={project.id} className={index === current ? 'is-current' : ''}>{project.name}</i>
              ))}
              {shown?.tagline && <figcaption>{shown.tagline}</figcaption>}
            </figure>
          </div>

          {rest > 0 && (
            <a className="works-more" href={CATALOG_PATH} onClick={event => open(event, CATALOG_PATH)}>
              {labels.catalogCta}: jeszcze {rest} {plural(rest, 'pozycja', 'pozycje', 'pozycji')}
            </a>
          )}
        </div>
      )}
    </section>
  )
}
