import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import { CATALOG_PATH } from '../lib/projects'
import { useActiveSection } from '../lib/ui'

const SECTIONS = [
  ['zakres', 'Zakres'],
  ['proces', 'Proces'],
  ['o-mnie', 'O mnie'],
]

const SECTION_IDS = SECTIONS.map(([id]) => id)

export default function Header({ brand, pages = [], home = true, onNavigate }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const active = useActiveSection(home ? SECTION_IDS : [])
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open)
    return () => document.body.classList.remove('no-scroll')
  }, [open])

  const href = id => (home ? `#${id}` : `/#${id}`)

  // Adresy wewnętrzne przechwytujemy, zakotwiczenia zostawiamy przeglądarce.
  const go = event => {
    setOpen(false)
    setPagesOpen(false)
    const target = event.currentTarget.getAttribute('href')
    if (onNavigate && target && !target.startsWith('#')) {
      event.preventDefault()
      onNavigate(target)
    }
  }

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <header className={`masthead ${scrolled ? 'is-scrolled' : ''}`}>
        <a className="wordmark" href="/" onClick={go}>
          <img className="wordmark-logo" src="/assets/brand/logo-ar-web.png" alt="" />
          <span>{brand.name}<i>{brand.role}</i></span>
        </a>

        {/* Obie nawigacje są zawsze w dokumencie — o tym, która jest widoczna,
            decyduje CSS, więc układ nigdy nie rozjeżdża się ze znacznikami. */}
        <nav className="masthead-nav">
          <a className={!home ? 'is-active' : ''} href={CATALOG_PATH} onClick={go}>Portfolio</a>
          {SECTIONS.map(([id, label]) => (
            <a key={id} className={home && active === id ? 'is-active' : ''} href={href(id)} onClick={go}>{label}</a>
          ))}
          {pages.length > 0 && (
            <div
              className={`nav-pages ${pagesOpen ? 'is-open' : ''}`}
              onMouseEnter={() => setPagesOpen(true)}
              onMouseLeave={() => setPagesOpen(false)}
            >
              <button type="button" onClick={() => setPagesOpen(value => !value)} aria-expanded={pagesOpen}>
                Oferta <ChevronDown size={13} />
              </button>
              <AnimatePresence>
                {pagesOpen && (
                  <motion.div
                    className="nav-dropdown"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div>
                      {pages.map(page => (
                        <a key={page.id} href={`/p/${page.slug}`} onClick={go}>
                          <b>{page.title}</b>
                          {page.excerpt && <span>{page.excerpt}</span>}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        <div className="masthead-actions">
          <a className="header-cta" href={href('kontakt')} onClick={go}>
            <span>Nowy projekt</span>
            <ArrowUpRight size={15} />
          </a>
          <button className="nav-toggle" onClick={() => setOpen(value => !value)} aria-label="Menu" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-sheet"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.24 }}
          >
            <nav>
              <a href={CATALOG_PATH} onClick={go}>Portfolio</a>
              {SECTIONS.map(([id, label]) => <a key={id} href={href(id)} onClick={go}>{label}</a>)}
              {pages.map(page => (
                <a key={page.id} href={`/p/${page.slug}`} onClick={go}>{page.title}</a>
              ))}
            </nav>
            <a className="btn btn-primary" href={href('kontakt')} onClick={go}>
              Napisz do mnie <ArrowUpRight size={16} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
