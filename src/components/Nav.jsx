import { useEffect, useState } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav id="nav" className={scrolled ? 'scrolled' : ''}>
      <div className="nav-inner">
        <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Adam <span>Rędzikowski</span>
        </div>
        <ul className="nav-links">
          <li><a onClick={() => scrollTo('about')}>O mnie</a></li>
          <li><a onClick={() => scrollTo('services')}>Usługi</a></li>
          <li><a onClick={() => scrollTo('portfolio')}>Portfolio</a></li>
          <li><a href="mailto:redzikowskia@gmail.com" className="nav-cta">Kontakt</a></li>
        </ul>
      </div>
    </nav>
  )
}
