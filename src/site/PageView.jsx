import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, LoaderCircle, Quote, X } from 'lucide-react'
import { Reveal, ease } from '../lib/ui'

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

function Block({ block, onZoom }) {
  switch (block.type) {
    case 'image':
      return block.src ? (
        <Reveal className={`pb pb-image ${block.layout === 'full' ? 'is-full' : ''}`}>
          <button type="button" onClick={() => onZoom(block.src)}>
            <img src={block.src} alt={block.alt} loading="lazy" />
          </button>
          {block.caption && <span className="pb-caption">{block.caption}</span>}
        </Reveal>
      ) : null

    case 'gallery':
      return block.images.length ? (
        <Reveal className="pb pb-gallery">
          {block.heading && <h2>{block.heading}</h2>}
          <div className="pb-gallery-grid">
            {block.images.map(image => (
              <button type="button" key={image.src} onClick={() => onZoom(image.src)}>
                <img src={image.src} alt={image.alt} loading="lazy" />
              </button>
            ))}
          </div>
        </Reveal>
      ) : null

    case 'features':
      return (
        <Reveal className="pb pb-features">
          {block.heading && <h2>{block.heading}</h2>}
          <div className="pb-features-grid">
            {block.items.map((item, index) => (
              <article key={index}>
                <span>{String(index + 1).padStart(2, '0')}</span>
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
          <a className="btn btn-primary" href={block.href}>{block.label} <ArrowRight size={17} /></a>
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
  const [page, setPage] = useState(null)
  const [status, setStatus] = useState('loading')
  const [zoom, setZoom] = useState('')

  useEffect(() => {
    let active = true
    setStatus('loading')
    fetch(`/api/pages/${encodeURIComponent(slug)}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('404'))))
      .then(data => { if (active) { setPage(data); setStatus('ready') } })
      .catch(() => active && setStatus('missing'))
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!page) return
    document.title = `${page.title} — Adam Rędzikowski`
    const meta = document.querySelector('meta[name="description"]')
    if (meta && page.seoDescription) meta.setAttribute('content', page.seoDescription)
  }, [page])

  useEffect(() => {
    const onKey = event => event.key === 'Escape' && setZoom('')
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (status === 'loading') {
    return <main className="page-state"><LoaderCircle className="spin" size={26} /><span>Wczytuję stronę…</span></main>
  }

  if (status === 'missing') {
    return (
      <main className="page-state">
        <h1>404</h1>
        <p>Ta strona nie istnieje albo została ukryta.</p>
        <a className="btn btn-primary" href="/" onClick={event => { event.preventDefault(); onNavigate('/') }}>
          Wróć na stronę główną
        </a>
      </main>
    )
  }

  return (
    <main className={`page-view accent-${page.accent || 'gold'}`}>
      <div className="page-aura" aria-hidden="true"><i /><i /></div>

      <header className="page-hero">
        <a className="page-back" href="/" onClick={event => { event.preventDefault(); onNavigate('/') }}>
          <ArrowLeft size={15} /> Strona główna
        </a>
        <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          {page.title}
        </motion.h1>
        {page.lead && (
          <motion.p className="page-lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12, ease }}>
            {page.lead}
          </motion.p>
        )}
        {page.cover && (
          <motion.div className="page-cover" initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease }}>
            <img src={page.cover} alt={page.title} />
          </motion.div>
        )}
      </header>

      <div className="page-blocks">
        {page.blocks.map(block => <Block key={block.id} block={block} onZoom={setZoom} />)}
      </div>

      <Reveal className="page-foot">
        <div>
          <span>Masz podobny projekt?</span>
          <h2>Opisz go w kilku zdaniach — <em className="accent">resztą zajmę się ja.</em></h2>
        </div>
        <a className="btn btn-primary" href="/#kontakt" onClick={event => { event.preventDefault(); onNavigate('/#kontakt') }}>
          Przejdź do formularza <ArrowRight size={17} />
        </a>
      </Reveal>

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom('')}
          >
            <button aria-label="Zamknij"><X size={20} /></button>
            <motion.img
              src={zoom}
              alt=""
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
