import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CATALOG_PATH, plural } from '../lib/projects'
import { KineticText, ease } from '../lib/ui'

/**
 * Pierwszy ekran jest cichy: tło ze znaków samo w sobie jest wydarzeniem, więc
 * nad nim stoi tylko typografia, jedno wezwanie i trzy liczby policzone
 * z rejestru. Liczby są prawdziwe — nie da się ich przeterminować w panelu.
 */

function counts(projects) {
  const apps = projects.filter(project => project.kind === 'app').length
  const sites = projects.length - apps
  const platforms = new Set(projects.flatMap(project => project.platforms || [])).size
  return [
    [projects.length, plural(projects.length, 'zbudowany produkt', 'zbudowane produkty', 'zbudowanych produktów')],
    [sites, plural(sites, 'serwis w sieci', 'serwisy w sieci', 'serwisów w sieci')],
    [apps, plural(apps, 'aplikacja do pobrania', 'aplikacje do pobrania', 'aplikacji do pobrania')],
    [platforms, plural(platforms, 'platforma wydania', 'platformy wydania', 'platform wydania')],
  ].filter(([value]) => value > 0)
}

export default function Hero({ hero, projects = [], onNavigate }) {
  const facts = counts(projects)

  return (
    <section className="hero" id="start">
      <div className="hero-inner">
        <h1 className="hero-title">
          <KineticText text={hero.titleTop} accent={hero.titleAccent} />
        </h1>

        <motion.p
          className="hero-lead"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease }}
        >
          {hero.lead}
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42, ease }}
        >
          <a className="btn btn-primary" href="#kontakt">{hero.primaryCta} <ArrowRight size={16} /></a>
          <a
            className="btn btn-ghost"
            href={CATALOG_PATH}
            onClick={event => { event.preventDefault(); onNavigate(CATALOG_PATH) }}
          >
            {hero.secondaryCta}
          </a>
          {hero.note && <span className="hero-note">{hero.note}</span>}
        </motion.div>

        {facts.length > 0 && (
          <motion.dl
            className="hero-facts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.56 }}
          >
            {facts.map(([value, label]) => (
              <div key={label}>
                <dt className="mono">{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </motion.dl>
        )}
      </div>
    </section>
  )
}
