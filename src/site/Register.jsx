import { Globe } from 'lucide-react'
import { CATALOG_PATH, PLATFORM_LABEL, hostOf } from '../lib/projects'
import PlatformIcon from '../lib/PlatformIcon'
import { useT } from '../lib/i18n'
import GlowEdge from '../lib/GlowEdge'
import StoreIcon, { STORE_LABEL } from '../lib/StoreIcon'

/**
 * Portfolio jako ściana plakatów. Każda praca ma plakat z repozytorium – ten
 * sam, który stoi w karuzeli na stronie głównej – więc karty wyglądają jak
 * jedna seria: znak strony, ikona, nazwa, zrzuty. Kadr pokazuje górę plakatu,
 * a pod kursorem plakat zjeżdża w dół i odsłania resztę.
 *
 * Bez plakatu karta bierze zrzut ekranu (z ikoną i nazwą na kadrze), a bez
 * zrzutu – kafel z ikoną. Żadna karta nie stoi pusta.
 */

/** Sklep → system, żeby filtr platformy łapał też aplikacje ze sklepów. */
const STORE_PLATFORM = { google: 'android', microsoft: 'windows', apple: 'ios' }

/** Platformy pracy: pliki, sklepy, plakaty, a strona internetowa to „web”. */
export function platformsOf(project) {
  const set = new Set(project.platforms || [])
  for (const store of project.stores || []) if (STORE_PLATFORM[store]) set.add(STORE_PLATFORM[store])
  for (const poster of project.posters || []) if (poster.platform) set.add(poster.platform)
  if (project.kind === 'web' || project.site) set.add('web')
  set.delete('other')
  return [...set]
}

/** Etykieta bez dopisku o platformach („Zegar i budzik / Android” → „Zegar i budzik”). */
const labelOf = project => String(project.label || '').split(' / ')[0].trim()

function Mark({ platform, size = 13 }) {
  if (platform === 'web') return <Globe size={size} aria-hidden="true" />
  return <PlatformIcon platform={platform} size={size} aria-hidden="true" />
}

function Proof({ project }) {
  const { t } = useT()
  const name = platform => (platform === 'web' ? t('platform.web') : PLATFORM_LABEL[platform] || platform)

  if (project.kind === 'app' && project.stores?.length) {
    return (
      <span className="pf-proof">
        {project.stores.map(store => (
          <span key={store} className="pf-platform" title={STORE_LABEL[store]}>
            <StoreIcon store={store} size={13} aria-hidden="true" />
            <i>{STORE_LABEL[store]}</i>
          </span>
        ))}
      </span>
    )
  }
  const platforms = platformsOf(project).filter(platform => platform !== 'web' || project.kind === 'web')
  if (project.kind === 'web' && project.site) {
    return <span className="pf-proof"><span className="pf-platform"><Mark platform="web" /><i className="mono">{hostOf(project.site)}</i></span></span>
  }
  if (platforms.length) {
    return (
      <span className="pf-proof">
        {platforms.map(platform => (
          <span key={platform} className="pf-platform" title={name(platform)}>
            <Mark platform={platform} />
            <i>{name(platform)}</i>
          </span>
        ))}
      </span>
    )
  }
  return <span className="pf-proof is-quiet">{t('register.onRequest')}</span>
}

function Art({ project, eager }) {
  const poster = project.posters?.[0]
  const loading = eager ? 'eager' : 'lazy'

  if (poster) {
    return (
      <img
        className="pf-art is-poster"
        src={poster.src}
        alt=""
        width="600"
        height="1067"
        loading={loading}
        decoding="async"
      />
    )
  }

  const shot = project.thumb || project.cover
  return (
    <>
      {shot
        ? <img className="pf-art is-shot" src={shot} alt="" loading={loading} decoding="async" />
        : <span className="pf-art is-blank" aria-hidden="true" />}
      <span className="pf-plate" aria-hidden="true">
        {project.icon
          ? <img src={project.icon} alt="" loading="lazy" />
          : <i>{project.name.slice(0, 1)}</i>}
        <b>{project.name}</b>
      </span>
    </>
  )
}

function Card({ project, onNavigate, index }) {
  const { lp, t } = useT()
  const href = lp(`${CATALOG_PATH}/${project.slug}`)
  const label = labelOf(project)
  const extra = (project.posters?.length || 0) - 1

  return (
    <li className="pf-item" style={{ '--i': index % 12 }}>
      <a
        className="pf-card"
        href={href}
        onClick={event => { event.preventDefault(); onNavigate(href) }}
      >
        <GlowEdge as="span" media className="pf-frame">
          <Art project={project} eager={index < 6} />
          {extra > 0 && <span className="pf-more">+{t('catalog.posters', extra)}</span>}
          <span className="pf-cta" aria-hidden="true">{t('catalog.open')} <span>→</span></span>
        </GlowEdge>

        <span className="pf-meta">
          <span className="pf-title">
            {project.icon && <img className="pf-icon" src={project.icon} alt="" loading="lazy" width="28" height="28" />}
            <strong>{project.name}</strong>
          </span>
          {label && <span className="pf-label">{label}</span>}
          {project.tagline && <span className="pf-note">{project.tagline}</span>}
          <span className="pf-foot"><Proof project={project} /></span>
        </span>
      </a>
    </li>
  )
}

export default function Register({ projects, onNavigate, empty }) {
  const { t } = useT()
  if (!projects.length) return <p className="work-empty">{empty || t('register.empty')}</p>

  return (
    <ul className="pf-grid">
      {projects.map((project, index) => (
        <Card key={project.id} project={project} onNavigate={onNavigate} index={index} />
      ))}
    </ul>
  )
}
