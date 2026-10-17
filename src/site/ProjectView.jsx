import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, LoaderCircle, X } from 'lucide-react'
import {
  CATALOG_PATH, KIND_LABEL, PLATFORM_ICON, PLATFORM_LABEL,
  formatBytes, formatDownloads, formatReleaseDate, hostOf,
} from '../lib/projects'
import { trackDownload } from '../lib/analytics'
import { Reveal, ease } from '../lib/ui'
import Lightbox from './Lightbox'

function Paragraphs({ text }) {
  return String(text || '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={index}>{paragraph}</p>)
}

/**
 * Pliki do pobrania. Jedna pozycja na platformę w kolejności ustalonej na
 * serwerze, obok rozmiar i wersja – to dane, więc idą fontem monospace.
 * Pliki z prywatnych repozytoriów lecą przez proxy API, więc adres jest
 * zawsze względny i nie ujawnia tokenu.
 */
function Downloads({ project }) {
  if (!project.downloads.length) {
    if (project.kind !== 'app') return null
    return (
      <div className="pv-downloads is-empty">
        <p>Wydanie publiczne jeszcze nie jest gotowe. Napisz, jeśli chcesz zobaczyć wersję roboczą.</p>
      </div>
    )
  }

  return (
    <div className="pv-downloads">
      <div className="pv-downloads-head">
        <h2>Do pobrania</h2>
        {project.downloadCount > 0 && (
          <p className="pv-download-total mono">{formatDownloads(project.downloadCount)}</p>
        )}
        {project.release && (
          <p className="pv-release">
            <span className="mono">{project.release.tag}</span>
            {project.release.publishedAt && <> · wydane {formatReleaseDate(project.release.publishedAt)}</>}
            {project.release.url && (
              <> · <a href={project.release.url} target="_blank" rel="noreferrer">historia wydań</a></>
            )}
          </p>
        )}
      </div>

      <ul className="pv-files">
        {project.downloads.map(file => {
          const Icon = PLATFORM_ICON[file.platform] || PLATFORM_ICON.other
          return (
            <li key={file.id}>
              <a
                href={file.url}
                download
                onClick={() => trackDownload({ project: project.slug, asset: file.id, platform: file.platform })}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="pv-file-main">
                  <strong>{PLATFORM_LABEL[file.platform] || file.platform}</strong>
                  {file.label && <span className="mono">{file.label}</span>}
                </span>
                <span className="pv-file-meta mono">
                  {file.version && <i>{file.version}</i>}
                  {formatBytes(file.size) && <i>{formatBytes(file.size)}</i>}
                  {file.count > 0 && <i title="Liczba pobrań">↓ {new Intl.NumberFormat('pl-PL').format(file.count)}</i>}
                </span>
                <Download size={17} aria-hidden="true" />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Gallery({ shots, name, onZoom }) {
  if (!shots.length) return null
  return (
    <Reveal
      className={`pv-gallery ${shots.length === 1 ? 'is-single' : ''}`}
      tabIndex={shots.length > 1 ? 0 : undefined}
      role="region"
      aria-label={`Zrzuty ekranu: ${name}`}
    >
      {shots.map((shot, index) => (
        <button type="button" key={shot.src} onClick={() => onZoom(index)}>
          <img
            src={shot.src}
            alt={shot.alt || `${name} – ekran ${index + 1}`}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        </button>
      ))}
    </Reveal>
  )
}

export default function ProjectView({ slug, onNavigate }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [zoom, setZoom] = useState(-1)

  useEffect(() => {
    let active = true
    setStatus('loading')
    fetch(`/api/projects/${encodeURIComponent(slug)}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then(payload => { if (active) { setData(payload); setStatus('ready') } })
      .catch(() => active && setStatus('missing'))
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (data?.project) document.title = `${data.project.name} – Adam Rędzikowski`
  }, [data])

  const shotCount = data?.project?.shots?.length || 0
  // Przewijanie w podglądzie zawija się: za ostatnim zdjęciem jest pierwsze.
  const step = delta => setZoom(current => (current < 0 ? current : (current + delta + shotCount) % shotCount))

  useEffect(() => {
    if (zoom < 0) return undefined
    const onKey = event => {
      if (event.key === 'Escape') setZoom(-1)
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [zoom >= 0, shotCount]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return <main className="page-state"><LoaderCircle className="spin" size={26} /><span>Wczytuję realizację…</span></main>
  }

  if (status === 'missing') {
    return (
      <main className="page-state">
        <h1>404</h1>
        <p>Tej pracy nie ma w portfolio albo nie jest opublikowana.</p>
        <a
          className="btn btn-primary"
          href={CATALOG_PATH}
          onClick={event => { event.preventDefault(); onNavigate(CATALOG_PATH) }}
        >
          Wróć do portfolio
        </a>
      </main>
    )
  }

  const { project, previous, next } = data
  const external = project.siteUrl?.startsWith('http')

  return (
    <main className="project-view">
      <div className="section">
        <a
          className="pv-back"
          href={CATALOG_PATH}
          onClick={event => { event.preventDefault(); onNavigate(CATALOG_PATH) }}
        >
          <ArrowLeft size={15} /> Portfolio
        </a>

        <header className="pv-head">
          <div className="pv-head-main">
            <span className="pv-tags">
              <span className="reg-kind" data-kind={project.kind}>{KIND_LABEL[project.kind] || project.kind}</span>
              {project.label && <span className="reg-label">{project.label}</span>}
              {project.year && <span className="reg-year mono">{project.year}</span>}
            </span>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
              {project.name}
            </motion.h1>
            {project.tagline && <p className="pv-tagline">{project.tagline}</p>}
          </div>

          <div className="pv-head-side">
            {project.siteUrl && (
              <a className="btn btn-primary" href={project.siteUrl} target={external ? '_blank' : undefined} rel="noreferrer">
                Otwórz {project.kind === 'app' ? 'stronę' : 'serwis'} <ExternalLink size={16} />
              </a>
            )}
            {project.siteUrl && <span className="pv-host mono">{hostOf(project.siteUrl)}</span>}
            {!project.siteUrl && project.kind === 'web' && (
              <span className="pv-host mono is-quiet">Adres nie jest publiczny – prezentacja na życzenie.</span>
            )}
            {project.repo && (
              <a className="pv-repo mono" href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer">
                github.com/{project.repo}
              </a>
            )}
          </div>
        </header>

        <Gallery shots={project.shots} name={project.name} onZoom={setZoom} />

        <div className="pv-body">
          <div className="pv-copy">
            {project.summary && <p className="pv-summary">{project.summary}</p>}
            <Paragraphs text={project.body} />
          </div>

          <aside className="pv-side">
            {project.features.length > 0 && (
              <div className="pv-panel">
                <h2>Funkcje</h2>
                <ul className="pv-features">
                  {project.features.map(feature => (
                    <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>
                  ))}
                </ul>
              </div>
            )}
            {project.stack.length > 0 && (
              <div className="pv-panel">
                <h2>Technologie</h2>
                <ul className="pv-stack">
                  {project.stack.map(item => <li className="mono" key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            {project.role && (
              <div className="pv-panel">
                <h2>Mój udział</h2>
                <p>{project.role}</p>
              </div>
            )}
          </aside>
        </div>

        <Downloads project={project} />

        {(previous || next) && (
          <nav className="pv-nav" aria-label="Inne prace">
            {previous && (
              <a
                href={`${CATALOG_PATH}/${previous.slug}`}
                onClick={event => { event.preventDefault(); onNavigate(`${CATALOG_PATH}/${previous.slug}`) }}
              >
                <ArrowLeft size={15} />
                <span>Poprzednia<strong>{previous.name}</strong></span>
              </a>
            )}
            {next && (
              <a
                className="is-next"
                href={`${CATALOG_PATH}/${next.slug}`}
                onClick={event => { event.preventDefault(); onNavigate(`${CATALOG_PATH}/${next.slug}`) }}
              >
                <span>Następna<strong>{next.name}</strong></span>
                <ArrowRight size={15} />
              </a>
            )}
          </nav>
        )}
      </div>

      {zoom >= 0 && project.shots[zoom] && (
        <Lightbox
          shots={project.shots}
          index={zoom}
          name={project.name}
          onClose={() => setZoom(-1)}
          onStep={step}
        />
      )}
    </main>
  )
}
