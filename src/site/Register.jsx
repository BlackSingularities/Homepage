import { ArrowUpRight } from 'lucide-react'
import { CATALOG_PATH, KIND_LABEL, PLATFORM_ICON, PLATFORM_LABEL, formatDownloads, hostOf } from '../lib/projects'
import { Reveal } from '../lib/ui'

/**
 * Lista prac. Każdy wiersz niesie informację, a nie ozdobę:
 * rodzaj treści, rok, i po prawej dowód – adres działającej strony albo
 * platformy, na które jest plik do pobrania.
 *
 * `lead` wyróżnia pierwszą pozycję dużą okładką; hierarchia bierze się wtedy
 * z kolejności ustawionej w panelu, nie z dodatkowej dekoracji.
 */

function Platforms({ project }) {
  if (project.kind === 'app' && project.platforms.length) {
    return (
      <span className="reg-platforms">
        {project.platforms.map(platform => {
          const Icon = PLATFORM_ICON[platform] || PLATFORM_ICON.other
          return (
            <span key={platform} title={PLATFORM_LABEL[platform] || platform}>
              <Icon size={14} aria-hidden="true" />
              <i>{PLATFORM_LABEL[platform] || platform}</i>
            </span>
          )
        })}
        {project.downloadCount > 0 && <span className="reg-downloads mono">{formatDownloads(project.downloadCount)}</span>}
      </span>
    )
  }
  if (project.site) return <span className="reg-host mono">{hostOf(project.site)}</span>
  return <span className="reg-host mono is-quiet">dostęp na życzenie</span>
}

function Row({ project, onNavigate, lead }) {
  const href = `${CATALOG_PATH}/${project.slug}`
  return (
    <a
      className={`reg-row ${lead ? 'is-lead' : ''}`}
      href={href}
      onClick={event => { event.preventDefault(); onNavigate(href) }}
    >
      <span className="reg-shot">
        {project.cover
          ? <img src={project.cover} alt="" loading={lead ? 'eager' : 'lazy'} />
          : <i aria-hidden="true">{project.name.slice(0, 2)}</i>}
      </span>

      <span className="reg-main">
        <strong>{project.name}</strong>
        {project.tagline && <span className="reg-tagline">{project.tagline}</span>}
        <span className="reg-tags">
          <span className="reg-kind" data-kind={project.kind}>{KIND_LABEL[project.kind] || project.kind}</span>
          {project.label && <span className="reg-label">{project.label}</span>}
        </span>
      </span>

      <span className="reg-side">
        <Platforms project={project} />
        {project.year && <span className="reg-year mono">{project.year}</span>}
      </span>

      <ArrowUpRight className="reg-go" size={18} aria-hidden="true" />
    </a>
  )
}

export default function Register({ projects, onNavigate, lead = false, empty }) {
  if (!projects.length) return <p className="reg-empty">{empty || 'Portfolio jest jeszcze puste.'}</p>

  return (
    <div className="register">
      {projects.map((project, index) => (
        <Reveal key={project.id} delay={Math.min(index, 5) * 0.05} amount={0.15} y={18}>
          <Row project={project} onNavigate={onNavigate} lead={lead && index === 0} />
        </Reveal>
      ))}
    </div>
  )
}
