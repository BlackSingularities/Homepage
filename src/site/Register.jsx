import { ArrowUpRight } from 'lucide-react'
import { CATALOG_PATH, PLATFORM_LABEL, hostOf } from '../lib/projects'
import PlatformIcon from '../lib/PlatformIcon'
import { useT } from '../lib/i18n'
import GlowEdge from '../lib/GlowEdge'
import StoreIcon, { STORE_LABEL } from '../lib/StoreIcon'

/**
 * Portfolio jako półka z dowodami: każda praca pokazuje swój ekran, a nie
 * wiersz tabeli. Zrzut niesie rozpoznanie, ikona siedzi na jego krawędzi,
 * rok stoi w rogu kadru, a pod spodem zostaje tylko to, co da się sprawdzić –
 * rodzaj pracy i adres działającej strony albo platformy z plikiem.
 *
 * `lead` daje pierwszej pozycji kadr na pełną szerokość; hierarchia bierze się
 * wtedy z kolejności ustawionej w panelu, nie z dodatkowej dekoracji.
 */

function Proof({ project }) {
  const { t } = useT()
  const platformName = platform => (platform === 'other' ? t('platform.other') : PLATFORM_LABEL[platform] || platform)

  if (project.kind === 'app' && project.stores?.length) {
    return (
      <span className="work-proof">
        {project.stores.map(store => (
          <span key={store} className="work-platform">
            <StoreIcon store={store} size={14} aria-hidden="true" />
            <i>{STORE_LABEL[store]}</i>
          </span>
        ))}
      </span>
    )
  }
  if (project.kind === 'app' && project.platforms.length) {
    return (
      <span className="work-proof">
        {project.platforms.map(platform => {
          return (
            <span key={platform} className="work-platform">
              <PlatformIcon platform={platform} size={14} aria-hidden="true" />
              <i>{platformName(platform)}</i>
            </span>
          )
        })}
        {project.downloadCount > 0 && <span className="work-downloads mono">{t('downloads', project.downloadCount)}</span>}
      </span>
    )
  }
  if (project.site) return <span className="work-proof mono">{hostOf(project.site)}</span>
  return <span className="work-proof mono is-quiet">{t('register.onRequest')}</span>
}

function Card({ project, onNavigate, lead }) {
  const { t, lp } = useT()
  const href = lp(`${CATALOG_PATH}/${project.slug}`)
  const shot = project.thumb || project.cover

  return (
    <a
      className={`work-card ${lead ? 'is-lead' : ''}`}
      href={href}
      onClick={event => { event.preventDefault(); onNavigate(href) }}
    >
      <GlowEdge as="span" media className="work-shot">
        {shot
          ? <img src={shot} alt="" loading={lead ? 'eager' : 'lazy'} />
          : <i aria-hidden="true">{project.name.slice(0, 2)}</i>}
        <span className="work-shot-veil" aria-hidden="true" />
        {project.year && <span className="work-year mono">{project.year}</span>}
      </GlowEdge>

      <span className="work-body">
        <span className="work-head">
          {project.icon && <img className="work-icon" src={project.icon} alt="" loading="lazy" />}
          <strong>{project.name}</strong>
          <ArrowUpRight className="work-go" size={lead ? 22 : 18} aria-hidden="true" />
        </span>

        {project.tagline && <span className="work-note">{project.tagline}</span>}

        <span className="work-foot">
          <span className="work-kind" data-kind={project.kind}>{project.label || t(`kind.${project.kind}`)}</span>
          <Proof project={project} />
        </span>
      </span>
    </a>
  )
}

export default function Register({ projects, onNavigate, lead = true, empty }) {
  const { t } = useT()
  if (!projects.length) return <p className="work-empty">{empty || t('register.empty')}</p>

  return (
    <div className="works-grid">
      {projects.map((project, index) => (
        <Card key={project.id} project={project} onNavigate={onNavigate} lead={lead && index === 0} />
      ))}
    </div>
  )
}
