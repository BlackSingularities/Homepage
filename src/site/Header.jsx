import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import { useActiveSection } from '../lib/ui'

const NAV = [
  ['uslugi', 'Zakres'],
  ['proces', 'Proces'],
  ['o-mnie', 'O mnie'],
]

const SECTION_IDS = NAV.map(([id]) => id)

export default function Header({ brand, pages = [], home = true, onNavigate }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const active = useActiveSection(home ? SECTION_IDS : [])
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  const roleParts = brand.role?.split(/\s+na\s+/i) || []

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
  const go = event => {
    setOpen(false)
    setPagesOpen(false)
    if (!onNavigate) return
    const target = event.currentTarget.getAttribute('href')
    if (target?.startsWith('/p/')) {
      event.preventDefault()
      onNavigate(target)
    }
  }

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <header className={`masthead ${scrolled ? 'is-scrolled' : ''}`}>
        <a className="wordmark" href="/" onClick={event => { if (onNavigate) { event.preventDefault(); onNavigate('/') } }}>
          <img className="wordmark-logo" src="/assets/brand/logo-ar-web.png" alt="" />
          <span>
            {brand.name}
            <i>
              {roleParts.length === 2 ? (
                <><span>{roleParts[0]}</span><span>na {roleParts[1]}</span></>
              ) : brand.role}
            </i>
          </span>
        </a>

        {/* Both navigations are always rendered — CSS decides which one shows,
            so the markup can never disagree with the layout. */}
        <nav className="masthead-nav">
          {NAV.map(([id, label]) => (
            <a key={id} className={home && active === id ? 'is-active' : ''} href={href(id)}>{label}</a>
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {pages.map(page => (
                      <a key={page.id} href={`/p/${page.slug}`} onClick={go}>
                        <b>{page.title}</b>
                        {page.excerpt && <span>{page.excerpt}</span>}
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        <div className="masthead-actions">
          <a className="header-cta" href={href('kontakt')}>
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
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28 }}
          >
            <nav>
              {NAV.map(([id, label], index) => (
                <a key={id} href={href(id)} onClick={go} style={{ '--i': index }}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{label}
                </a>
              ))}
              {pages.map((page, index) => (
                <a key={page.id} href={`/p/${page.slug}`} onClick={go} style={{ '--i': NAV.length + index }}>
                  <span>+</span>{page.title}
                </a>
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
