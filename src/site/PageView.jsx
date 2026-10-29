import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, Quote } from 'lucide-react'
import { Reveal } from '../lib/ui'
import Heading from './Heading'
import Lightbox from './Lightbox'
import GlowEdge from '../lib/GlowEdge'
import { localePath, useLang, useT } from '../lib/i18n'
import { applySeo, describe } from '../lib/seo'

function Paragraphs({ text }) {
  return String(text || '')
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index}>
        {paragraph.split('\n').map((line, lineIndex, lines) => (
          <span key={lineIndex}>{line}{lineIndex < lines.length - 1 && <br />}</span>
        ))}
      </p>
    ))
}

function Block({ block, onZoom, onNavigate }) {
  const lang = useLang()
  switch (block.type) {
    case 'image':
      return block.src ? (
        <Reveal className={`pb pb-image ${block.layout === 'full' ? 'is-full' : ''}`}>
          <GlowEdge as="button" media type="button" onClick={() => onZoom([block], 0)}>
            <img src={block.src} alt={block.alt} loading="lazy" />
          </GlowEdge>
          {block.caption && <span className="pb-caption">{block.caption}</span>}
        </Reveal>
      ) : null

    case 'gallery':
      return block.images.length ? (
        <Reveal className="pb pb-gallery">
          {block.heading && <h2>{block.heading}</h2>}
          <div className="pb-gallery-grid">
            {block.images.map((image, index) => (
              <GlowEdge as="button" media type="button" key={image.src} onClick={() => onZoom(block.images, index)}>
                <img src={image.src} alt={image.alt} loading="lazy" />
              </GlowEdge>
            ))}
          </div>
        </Reveal>
      ) : null

    case 'features':
      return (
        <Reveal className="pb pb-features">
          {block.heading && <h2>{block.heading}</h2>}
          <div className="pb-features-grid">
            {block.items.map(item => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </Reveal>
      )

    case 'stats':
      return (
        <Reveal className="pb pb-stats">
          {block.heading && <h2>{block.heading}</h2>}
          <div className="pb-stats-grid">
            {block.items.map((item, index) => (
              <div key={index}><b>{item.value}</b><span>{item.label}</span></div>
            ))}
          </div>
        </Reveal>
      )

    case 'quote':
      return (
        <Reveal className="pb pb-quote">
          <Quote size={26} />
          <blockquote>{block.body}</blockquote>
          {block.author && <cite>{block.author}</cite>}
        </Reveal>
      )

    case 'cta':
      return (
        <Reveal className="pb pb-cta">
          <div>
            <h2>{block.heading}</h2>
            {block.body && <p>{block.body}</p>}
          </div>
          <a
            className="btn btn-primary"
            href={localePath(block.href, lang)}
            onClick={event => {
              const target = localePath(block.href, lang)
              if (!target.startsWith('/') || target.startsWith('//')) return
              event.preventDefault()
              onNavigate(target)
            }}
          >{block.label} <ArrowRight size={17} /></a>
        </Reveal>
      )

    default:
      return (
        <Reveal className={`pb pb-text ${block.layout === 'wide' ? 'is-wide' : ''}`}>
          {block.heading && <h2>{block.heading}</h2>}
          <div className="pb-body"><Paragraphs text={block.body} /></div>
        </Reveal>
      )
  }
}

export default function PageView({ slug, onNavigate }) {
  const { t, lp, lang } = useT()
  const [page, setPage] = useState(null)
  const [status, setStatus] = useState('loading')
  // podgląd: lista zdjęć z bloku i numer otwartego
  const [zoom, setZoom] = useState(null)
  const openZoom = (images, index) => setZoom({ images, index })
  const step = delta => setZoom(current => current && ({
    ...current,
    index: (current.index + delta + current.images.length) % current.images.length,
  }))

  useEffect(() => {
    let active = true
    setStatus('loading')
    fetch(`/api/pages/${encodeURIComponent(slug)}?lang=${lang}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then(data => { if (active) { setPage(data); setStatus('ready') } })
      .catch(() => active && setStatus('missing'))
    return () => { active = false }
  }, [slug, lang])

  useEffect(() => {
    if (status === 'missing') {
      applySeo({ lang, path: `/p/${slug}`, title: t('seo.notFound'), noindex: true })
    }
    if (!page || status !== 'ready') return
    applySeo({
      lang,
      path: `/p/${page.slug}`,
      title: `${page.title} | Adam Rędzikowski`,
      description: describe(page.seoDescription || page.lead || page.excerpt),
      image: page.cover,
    })
  }, [page, status, lang, slug, t])

  useEffect(() => {
    if (!zoom) return undefined
    const onKey = event => {
      if (event.key === 'Escape') setZoom(null)
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [Boolean(zoom)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return <main className="page-state"><LoaderCircle className="spin" size={26} /><span>{t('page.loading')}</span></main>
  }

  if (status === 'missing') {
    return (
      <main className="page-state">
        <h1>404</h1>
        <p>{t('page.missing')}</p>
        <a className="btn btn-primary" href={lp('/')} onClick={event => { event.preventDefault(); onNavigate(lp('/')) }}>
          {t('page.backHome')}
        </a>
      </main>
    )
  }

  return (
    <main className={`page-view accent-${page.accent || 'gold'}`}>
      <header className="page-hero">
        <a className="page-back" href={lp('/')} onClick={event => { event.preventDefault(); onNavigate(lp('/')) }}>
          <ArrowLeft size={15} /> {t('page.home')}
        </a>
        <h1 className="rise">{page.title}</h1>
        {page.lead && (
          <p className="page-lead rise" style={{ '--rise-delay': '0.12s' }}>{page.lead}</p>
        )}
        {page.cover && (
          <div className="page-cover rise" style={{ '--rise-delay': '0.24s' }}>
            <img src={page.cover} alt={page.title} />
          </div>
        )}
      </header>

      <div className="page-blocks">
        {page.blocks.map(block => <Block key={block.id} block={block} onZoom={openZoom} onNavigate={onNavigate} />)}
      </div>

      <Reveal className="page-foot">
        <div>
          <span>{t('page.footKicker')}</span>
          <h2><Heading title={t('page.footTitle')} accent={t('page.footAccent')} /></h2>
        </div>
        <a className="btn btn-primary" href={lp('/#kontakt')} onClick={event => { event.preventDefault(); onNavigate(lp('/#kontakt')) }}>
          {t('page.footCta')} <ArrowRight size={17} />
        </a>
      </Reveal>

      {zoom && (
        <Lightbox
          shots={zoom.images}
          index={zoom.index}
          name={page.title}
          onClose={() => setZoom(null)}
          onStep={step}
        />
      )}
    </main>
  )
}
