import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, LoaderCircle, X } from 'lucide-react'
import {
  CATALOG_PATH, PLATFORM_ICON, PLATFORM_LABEL,
  formatBytes, formatReleaseDate, hostOf,
} from '../lib/projects'
import { LOCALE, useT } from '../lib/i18n'
import { applySeo, describe } from '../lib/seo'
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
  const { t, lang } = useT()
  const platformName = platform => (platform === 'other' ? t('platform.other') : PLATFORM_LABEL[platform] || platform)
  if (!project.downloads.length) {
    if (project.kind !== 'app') return null
    return (
      <div className="pv-downloads is-empty">
        <p>{t('project.noRelease')}</p>
      </div>
    )
  }

  return (
    <div className="pv-downloads">
      <div className="pv-downloads-head">
        <h2>{t('project.downloads')}</h2>
        {project.downloadCount > 0 && (
          <p className="pv-download-total mono">{t('downloads', project.downloadCount)}</p>
        )}
        {project.release && (
          <p className="pv-release">
            <span className="mono">{project.release.tag}</span>
            {project.release.publishedAt && <> · {t('project.released', formatReleaseDate(project.release.publishedAt, LOCALE[lang]))}</>}
            {project.release.url && (
              <> · <a href={project.release.url} target="_blank" rel="noreferrer">{t('project.history')}</a></>
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
                  <strong>{platformName(file.platform)}</strong>
                  {file.label && <span className="mono">{file.label}</span>}
                </span>
                <span className="pv-file-meta mono">
                  {file.version && <i>{file.version}</i>}
                  {formatBytes(file.size) && <i>{formatBytes(file.size)}</i>}
                  {file.count > 0 && <i title={t('project.downloadCount')}>↓ {new Intl.NumberFormat(LOCALE[lang]).format(file.count)}</i>}
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
  const { t } = useT()
  if (!shots.length) return null
  return (
    <Reveal
      className={`pv-gallery ${shots.length === 1 ? 'is-single' : ''}`}
      tabIndex={shots.length > 1 ? 0 : undefined}
      role="region"
      aria-label={t('project.shots', name)}
    >
      {shots.map((shot, index) => (
        <button type="button" key={shot.src} onClick={() => onZoom(index)}>
          <img
            src={shot.src}
            alt={shot.alt || t('project.shot', name, index + 1)}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        </button>
      ))}
    </Reveal>
  )
}

export default function ProjectView({ slug, onNavigate }) {
  const { t, lp, lang } = useT()
  const catalog = lp(CATALOG_PATH)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [zoom, setZoom] = useState(-1)

  useEffect(() => {
    let active = true
    setStatus('loading')
    fetch(`/api/projects/${encodeURIComponent(slug)}?lang=${lang}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then(payload => { if (active) { setData(payload); setStatus('ready') } })
      .catch(() => active && setStatus('missing'))
    return () => { active = false }
  }, [slug, lang])

  useEffect(() => {
    const project = data?.project
    if (status === 'missing') {
      applySeo({ lang, path: `${CATALOG_PATH}/${slug}`, title: t('seo.notFound'), noindex: true })
    }
    if (!project || status !== 'ready') return
    applySeo({
      lang,
      path: `${CATALOG_PATH}/${project.slug}`,
      title: `${project.name} – ${project.label || t(`kind.${project.kind}`)} | Adam Rędzikowski`,
      description: describe(project.tagline || project.summary || project.body),
      image: project.cover,
    })
  }, [data, status, lang, slug, t])

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
    return <main className="page-state"><LoaderCircle className="spin" size={26} /><span>{t('project.loading')}</span></main>
  }

  if (status === 'missing') {
    return (
      <main className="page-state">
        <h1>404</h1>
        <p>{t('project.missing')}</p>
        <a
          className="btn btn-primary"
          href={catalog}
          onClick={event => { event.preventDefault(); onNavigate(catalog) }}
        >
          {t('project.backToPortfolio')}
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
          href={catalog}
          onClick={event => { event.preventDefault(); onNavigate(catalog) }}
        >
          <ArrowLeft size={15} /> {t('nav.portfolio')}
        </a>

        <header className="pv-head">
          <div className="pv-head-main">
            <span className="pv-tags">
              <span className="reg-kind" data-kind={project.kind}>{t(`kind.${project.kind}`)}</span>
              {project.label && <span className="reg-label">{project.label}</span>}
              {project.year && <span className="reg-year mono">{project.year}</span>}
            </span>
            <div className="pv-title">
              {project.icon && <img className="pv-icon" src={project.icon} alt="" />}
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
                {project.name}
              </motion.h1>
            </div>
            {project.tagline && <p className="pv-tagline">{project.tagline}</p>}
          </div>

          <div className="pv-head-side">
            {project.siteUrl && (
              <a className="btn btn-primary" href={project.siteUrl} target={external ? '_blank' : undefined} rel="noreferrer">
                {t('project.open', project.kind)} <ExternalLink size={16} />
              </a>
            )}
            {project.siteUrl && <span className="pv-host mono">{hostOf(project.siteUrl)}</span>}
            {!project.siteUrl && project.kind === 'web' && (
              <span className="pv-host mono is-quiet">{t('project.private')}</span>
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
                <h2>{t('project.features')}</h2>
                <ul className="pv-features">
                  {project.features.map(feature => (
                    <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>
                  ))}
                </ul>
              </div>
            )}
            {project.stack.length > 0 && (
              <div className="pv-panel">
                <h2>{t('project.stack')}</h2>
                <ul className="pv-stack">
                  {project.stack.map(item => <li className="mono" key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            {project.role && (
              <div className="pv-panel">
                <h2>{t('project.role')}</h2>
                <p>{project.role}</p>
              </div>
            )}
          </aside>
        </div>

        <Downloads project={project} />

        {(previous || next) && (
          <nav className="pv-nav" aria-label={t('project.others')}>
            {previous && (
              <a
                href={lp(`${CATALOG_PATH}/${previous.slug}`)}
                onClick={event => { event.preventDefault(); onNavigate(lp(`${CATALOG_PATH}/${previous.slug}`)) }}
              >
                <ArrowLeft size={15} />
                <span>{t('project.previous')}<strong>{previous.name}</strong></span>
              </a>
            )}
            {next && (
              <a
                className="is-next"
                href={lp(`${CATALOG_PATH}/${next.slug}`)}
                onClick={event => { event.preventDefault(); onNavigate(lp(`${CATALOG_PATH}/${next.slug}`)) }}
              >
                <span>{t('project.next')}<strong>{next.name}</strong></span>
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
