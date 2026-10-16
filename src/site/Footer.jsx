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
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/assets/brand/logo-ar-web.png" alt="" />
          <p>{brand.tagline}</p>
        </div>

        <nav className="footer-nav" aria-label="Stopka">
          <a href={href('zakres')} onClick={go}>Oferta</a>
          <a href={href('proces')} onClick={go}>Proces</a>
          <a href={CATALOG_PATH} onClick={go}>Portfolio</a>
          <a href={href('o-mnie')} onClick={go}>O mnie</a>
          {pages.slice(0, 6).map(page => (
            <a key={page.id} href={`/p/${page.slug}`} onClick={go}>{page.title}</a>
          ))}
          <a href={href('kontakt')} onClick={go}>Kontakt</a>
          {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
          {brand.phone && <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>}
        </nav>

        <p className="footer-legal">
          © {year} {brand.name}. {brand.location}.
        </p>
      </div>
    </footer>
  )
}
