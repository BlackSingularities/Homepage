import { ArrowUp } from 'lucide-react'
import { CATALOG_PATH } from '../lib/projects'

export default function Footer({ brand, pages = [], onNavigate, home = true }) {
  const href = id => (home ? `#${id}` : `/#${id}`)
  const year = new Date().getFullYear()

  const go = event => {
    const target = event.currentTarget.getAttribute('href')
    if (onNavigate && target && !target.startsWith('#')) {
      event.preventDefault()
      onNavigate(target)
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <img className="footer-logo" src="/assets/brand/logo-ar-web.png" alt="" />
          <span>{brand.name}<i>{brand.role}</i></span>
          <p>{brand.tagline}</p>
        </div>

        <nav className="footer-nav">
          <div>
            <span>Strona</span>
            <a href={CATALOG_PATH} onClick={go}>Portfolio</a>
            <a href={href('zakres')} onClick={go}>Zakres</a>
            <a href={href('proces')} onClick={go}>Proces</a>
            <a href={href('o-mnie')} onClick={go}>O mnie</a>
          </div>
          {pages.length > 0 && (
            <div>
              <span>Oferta</span>
              {pages.slice(0, 6).map(page => (
                <a key={page.id} href={`/p/${page.slug}`} onClick={go}>{page.title}</a>
              ))}
            </div>
          )}
          <div>
            <span>Kontakt</span>
            <a href={href('kontakt')} onClick={go}>Formularz projektowy</a>
            {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
            {brand.phone && <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>}
            <span className="footer-place">{brand.location}</span>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <span>© {year} {brand.name}</span>
        <span>Zaprojektowane i zbudowane od zera.</span>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Do góry <ArrowUp size={14} />
        </button>
      </div>
    </footer>
  )
}
