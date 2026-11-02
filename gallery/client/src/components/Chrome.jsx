import { Link } from 'react-router-dom'

/**
 * Pasek i stopka wspólne dla widoków galerii – ten sam układ i ta sama
 * typografia, co na redzikowski.com, żeby galeria była częścią strony,
 * a nie osobnym światem.
 */

export function Nav({ current = 'portfolio' }) {
  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">Adam Rędzikowski</Link>
      <div className="nav-links">
        <a href="/" className="nav-link">Strona główna</a>
        <Link to="/" className={`nav-link ${current === 'portfolio' ? 'active' : ''}`}>Galeria</Link>
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>© {new Date().getFullYear()} Adam Rędzikowski</span>
        <span className="site-footer-links">
          <a href="/">redzikowski.com</a>
          <a href="mailto:kontakt@redzikowski.com">kontakt@redzikowski.com</a>
        </span>
      </div>
    </footer>
  )
}
