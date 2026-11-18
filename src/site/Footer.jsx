import { openConsent } from '../lib/analytics'
import { CATALOG_PATH } from '../lib/projects'
import { useT } from '../lib/i18n'

export default function Footer({ brand, pages = [], onNavigate, home = true }) {
  const { t, lp } = useT()
  const href = id => (home ? `#${id}` : lp(`/#${id}`))
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
          <img src="/assets/brand/wordmark-redzikowski-com.png" alt="rędzikowski.com" />
          <p>{brand.tagline}</p>
        </div>

        <nav className="footer-nav" aria-label={t('nav.footer')}>
          <a href={href('zakres')} onClick={go}>{t('nav.offer')}</a>
          <a href={href('proces')} onClick={go}>{t('nav.process')}</a>
          <a href={lp(CATALOG_PATH)} onClick={go}>{t('nav.portfolio')}</a>
          <a href={lp('/do-pobrania')} onClick={go}>{t('nav.resources')}</a>
          <a href={lp('/przydatne-linki')} onClick={go}>{t('nav.links')}</a>
          <a href={href('o-mnie')} onClick={go}>{t('nav.about')}</a>
          {pages.slice(0, 6).map(page => (
            <a key={page.id} href={lp(`/p/${page.slug}`)} onClick={go}>{page.title}</a>
          ))}
          <a href={href('kontakt')} onClick={go}>{t('nav.contact')}</a>
          {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
          {brand.phone && <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>}
        </nav>

        <p className="footer-legal">
          <span>© {year} {brand.name}. {brand.location}.</span>
          <button type="button" className="footer-consent" onClick={openConsent}>{t('footer.privacy')}</button>
          <a className="footer-consent" href="/aplikacje/gran/prywatnosc" onClick={go}>{t('footer.appPrivacy')}</a>
        </p>
      </div>
    </footer>
  )
}
