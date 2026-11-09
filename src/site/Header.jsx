import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { CATALOG_PATH } from '../lib/projects'
import { LANGS, LANG_NAME, localePath, useT } from '../lib/i18n'
import { useActiveSection } from '../lib/ui'

const SECTIONS = [
  ['zakres', 'nav.offer'],
  ['proces', 'nav.process'],
  ['portfolio', 'nav.portfolio'],
  ['do-pobrania', 'nav.resources'],
  ['o-mnie', 'nav.about'],
]

// Portfolio to osobna podstrona, nie sekcja – ma własny adres i podświetla
// się poza stroną główną.
const PORTFOLIO = 'portfolio'

const SECTION_IDS = SECTIONS.map(([id]) => id).filter(id => id !== PORTFOLIO)

/**
 * Przełącznik języka: prowadzi do odpowiednika bieżącej podstrony, więc nikt
 * nie ląduje z powrotem na stronie głównej. Kotwica sekcji jedzie razem z nim.
 */
export function LangSwitch({ path, onNavigate, className = '' }) {
  const { lang, t } = useT()
  return (
    <nav className={`lang-switch ${className}`} aria-label={t('nav.language')}>
      {LANGS.map(code => {
        const href = localePath(path, code)
        return (
          <a
            key={code}
            href={href}
            hrefLang={code}
            lang={code}
            title={LANG_NAME[code]}
            aria-current={code === lang ? 'true' : undefined}
            className={code === lang ? 'is-active' : ''}
            onClick={event => {
              event.preventDefault()
              if (code !== lang) onNavigate(`${href}${window.location.hash || ''}`)
            }}
          >
            {code.toUpperCase()}
          </a>
        )
      })}
    </nav>
  )
}

/**
 * Pasek jest cienki i nieprzezroczysty dopiero po zjechaniu z pierwszego
 * ekranu. Kontakt to zwykły link w obwódce – złoto zostaje dla jednego
 * przycisku na ekranie, a nie dla nawigacji.
 */
export default function Header({ brand, pages = [], home = true, path = '/', onNavigate }) {
  const { t, lp } = useT()
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

  const href = id => (id === 'do-pobrania' ? lp('/do-pobrania') : id === PORTFOLIO ? lp(CATALOG_PATH) : home ? `#${id}` : lp(`/#${id}`))
  const isActive = id => (id === 'do-pobrania' ? path.startsWith('/do-pobrania') : id === PORTFOLIO ? path.startsWith(CATALOG_PATH) : home && active === id)

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
        <a className="wordmark" href={lp('/')} onClick={go}>
          <img src="/assets/brand/wordmark-redzikowski-com.png" alt="rędzikowski.com" />
        </a>

        <nav className="masthead-nav" aria-label={t('nav.main')}>
          {SECTIONS.map(([id, key]) => {
            const link = (
              <a key={id} className={isActive(id) ? 'is-active' : ''} href={href(id)} onClick={go}>
                {t(key)}
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
                      <a key={page.id} href={lp(`/p/${page.slug}`)} onClick={go}>
                        <b>{page.title}</b>
                        {page.excerpt && <span>{page.excerpt}</span>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <a className="masthead-cta" href={href('kontakt')} onClick={go}>{t('nav.contact')}</a>
        </nav>

        <LangSwitch path={path} onNavigate={target => { setOpen(false); onNavigate(target) }} />

        <button className="nav-toggle" onClick={() => setOpen(value => !value)} aria-label={t('nav.menu')} aria-expanded={open}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {open && (
        <div className="mobile-sheet">
          <nav aria-label={t('nav.main')}>
            {SECTIONS.map(([id, key]) => <a key={id} href={href(id)} onClick={go}>{t(key)}</a>)}
            {pages.map(page => (
              <a key={page.id} href={lp(`/p/${page.slug}`)} onClick={go}>{page.title}</a>
            ))}
            <a href={href('kontakt')} onClick={go}>{t('nav.contact')}</a>
          </nav>
        </div>
      )}
    </>
  )
}
