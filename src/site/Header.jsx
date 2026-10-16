import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { CATALOG_PATH } from '../lib/projects'
import { useActiveSection } from '../lib/ui'

const SECTIONS = [
  ['zakres', 'Oferta'],
  ['proces', 'Proces'],
  ['portfolio', 'Portfolio'],
  ['o-mnie', 'O mnie'],
]

// Portfolio to osobna podstrona, nie sekcja – ma własny adres i podświetla
// się poza stroną główną.
const PORTFOLIO = 'portfolio'

const SECTION_IDS = SECTIONS.map(([id]) => id).filter(id => id !== PORTFOLIO)

/**
 * Pasek jest cienki i nieprzezroczysty dopiero po zjechaniu z pierwszego
 * ekranu. Kontakt to zwykły link w obwódce – złoto zostaje dla jednego
 * przycisku na ekranie, a nie dla nawigacji.
 */
export default function Header({ brand, pages = [], home = true, onNavigate }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const active = useActiveSection(home ? SECTION_IDS : [])

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

  const href = id => (id === PORTFOLIO ? CATALOG_PATH : home ? `#${id}` : `/#${id}`)
  const isActive = id => (id === PORTFOLIO ? !home : home && active === id)

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
      <header className={`masthead ${scrolled || !home ? 'is-solid' : ''}`}>
        <a className="wordmark" href="/" onClick={go}>
          <img src="/assets/brand/logo-ar-web.png" alt="" />
          <span>{brand.name}</span>
        </a>

        <nav className="masthead-nav" aria-label="Główna">
          {SECTIONS.map(([id, label]) => {
            const link = (
              <a key={id} className={isActive(id) ? 'is-active' : ''} href={href(id)} onClick={go}>
                {label}
                {id === 'zakres' && pages.length > 0 && <ChevronDown size={13} aria-hidden="true" />}
              </a>
            )
            if (id !== 'zakres' || pages.length === 0) return link
            // „Oferta” prowadzi do sekcji zakresu, a po najechaniu (albo
            // fokusie) pokazuje podstrony ze szczegółami.
            return (
              <div
                key={id}
                className={`nav-pages ${pagesOpen ? 'is-open' : ''}`}
                onMouseEnter={() => setPagesOpen(true)}
                onMouseLeave={() => setPagesOpen(false)}
                onFocus={() => setPagesOpen(true)}
                onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPagesOpen(false) }}
              >
                {link}
                {pagesOpen && (
                  <div className="nav-dropdown">
                    {pages.map(page => (
                      <a key={page.id} href={`/p/${page.slug}`} onClick={go}>
                        <b>{page.title}</b>
                        {page.excerpt && <span>{page.excerpt}</span>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <a className="masthead-cta" href={href('kontakt')} onClick={go}>Kontakt</a>
        </nav>

        <button className="nav-toggle" onClick={() => setOpen(value => !value)} aria-label="Menu" aria-expanded={open}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {open && (
        <div className="mobile-sheet">
          <nav aria-label="Główna">
            {SECTIONS.map(([id, label]) => <a key={id} href={href(id)} onClick={go}>{label}</a>)}
            {pages.map(page => (
              <a key={page.id} href={`/p/${page.slug}`} onClick={go}>{page.title}</a>
            ))}
            <a href={href('kontakt')} onClick={go}>Kontakt</a>
          </nav>
        </div>
      )}
    </>
  )
}
