import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, LoaderCircle, X } from 'lucide-react'
import {
  CATALOG_PATH, PLATFORM_ICON, PLATFORM_LABEL,
  formatBytes, formatReleaseDate, hostOf,
} from '../lib/projects'
import { LOCALE, useT } from '../lib/i18n'
import { applySeo, describe } from '../lib/seo'
import { trackDownload, trackStore } from '../lib/analytics'
import StoreIcon from '../lib/StoreIcon'
import { Reveal, ease } from '../lib/ui'
import Lightbox from './Lightbox'
import GlowEdge from '../lib/GlowEdge'

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
/**
 * Plakietki sklepów. Gdy aplikacja jest w sklepie, zastępują pliki z wydania
 * – jedna ścieżka instalacji na platformę zamiast dwóch konkurujących.
 */
function Stores({ project }) {
  const { t } = useT()
  return (
    <div className="pv-downloads">
      <div className="pv-downloads-head">
        <h2>{t('project.stores')}</h2>
      </div>
      <ul className="pv-stores">
        {project.stores.map(store => (
          <li key={store.id}>
            <a
              href={store.url}
              target="_blank"
              rel="noreferrer"
              data-store={store.id}
              onClick={() => trackStore({ project: project.slug, store: store.id })}
            >
              <StoreIcon store={store.id} size={26} aria-hidden="true" />
              <span>
                <small>{t('project.storeCta')}</small>
                <strong>{store.name}</strong>
              </span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Downloads({ project }) {
  const { t, lang } = useT()
  if (project.stores?.length) return <Stores project={project} />
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
            {project.release.history?.some(item => item.notes) && (
              <> · <a href="#zmiany">{t('project.history')}</a></>
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
                onClick={() => trackDownload({ project: project.slug, asset: file.id, platform: file.platform, version: file.version })}
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

/**
 * Notatki wydania z GitHuba w uproszczonym Markdownie: nagłówki, punkty
 * i zwykłe akapity. Pogrubienia i kod tracą znaczniki – zostaje sama treść.
 */
function Notes({ text }) {
  const plain = line => line.replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  const blocks = []
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim()
    if (!line) { blocks.push(null); continue }
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'list') last.items.push(plain(bullet[1]))
      else blocks.push({ type: 'list', items: [plain(bullet[1])] })
    } else if (heading) {
      blocks.push({ type: 'heading', text: plain(heading[1]) })
    } else if (last?.type === 'text') {
      last.text += ` ${plain(line)}`
    } else {
      blocks.push({ type: 'text', text: plain(line) })
    }
  }
  return blocks.filter(Boolean).map((block, index) => {
    if (block.type === 'list') return <ul key={index}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    if (block.type === 'heading') return <h4 key={index}>{block.text}</h4>
    return <p key={index}>{block.text}</p>
  })
}

/** Historia wydań – zastępuje stronę wydań na GitHubie, bo repozytoria są prywatne. */
function Changelog({ project }) {
  const { t, lang } = useT()
  const history = (project.release?.history || []).filter(item => item.notes)
  if (!history.length) return null
  return (
    <section className="pv-changelog" id="zmiany">
      <h2>{t('project.changelog')}</h2>
      <ol>
        {history.map((item, index) => (
          <li key={item.tag}>
            <details open={index === 0}>
              <summary>
                <span className="mono">{item.tag}</span>
                {item.prerelease && <span className="pv-changelog-pre mono">{t('project.prerelease')}</span>}
                {item.publishedAt && <time className="mono" dateTime={item.publishedAt}>{formatReleaseDate(item.publishedAt, LOCALE[lang])}</time>}
              </summary>
              <div className="pv-changelog-notes"><Notes text={item.notes} /></div>
            </details>
          </li>
        ))}
      </ol>
    </section>
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
        <GlowEdge as="button" media type="button" key={shot.src} onClick={() => onZoom(index)}>
          <img
            src={shot.src}
            alt={shot.alt || t('project.shot', name, index + 1)}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        </GlowEdge>
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

        <Changelog project={project} />

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
