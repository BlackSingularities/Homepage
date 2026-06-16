import { useEffect, useRef } from 'react'

export default function Contact() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.reveal')
    if (!els) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.15 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <section id="contact" ref={sectionRef}>
        <div className="container">
          <div className="contact-inner">
            <p className="section-label reveal" style={{ justifyContent: 'center' }}>Kontakt</p>

            <h2 className="contact-heading reveal reveal-delay-1">
              Porozmawiajmy<br/><em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--gold-light)' }}>o projekcie</em>
            </h2>

            <p className="contact-sub reveal reveal-delay-2">
              Masz pomysł na aplikację, stronę lub kampanię graficzną?<br/>
              Napisz — chętnie porozmawiam o szczegółach i możliwościach współpracy.
            </p>

            <a href="mailto:redzikowskia@gmail.com" className="contact-email reveal reveal-delay-2">
              redzikowskia@gmail.com
            </a>

            <div className="contact-socials reveal reveal-delay-3">
              <a href="https://github.com/adam001d" className="social-link" target="_blank" rel="noopener noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
                GitHub
              </a>
              <a href="https://www.projecttravel.pl/" className="social-link" target="_blank" rel="noopener noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  <path d="M2 12h20"/>
                </svg>
                ProjectTravel.pl
              </a>
              <a href="mailto:redzikowskia@gmail.com" className="social-link">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <p>© {new Date().getFullYear()} Adam Rędzikowski. Wszelkie prawa zastrzeżone.</p>
        <p>Zaprojektowane i zakodowane przez <a href="mailto:redzikowskia@gmail.com">Adama Rędzikowskiego</a></p>
      </footer>
    </>
  )
}
