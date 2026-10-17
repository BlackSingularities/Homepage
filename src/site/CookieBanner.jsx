import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CONSENT_EVENT, getConsent, setConsent } from '../lib/analytics'
import { ease } from '../lib/ui'

/**
 * Zgoda na statystyki. Bez niej strona liczy tylko anonimowe odsłony i
 * pobrania; po akceptacji zapamiętuje losowy identyfikator przeglądarki.
 * Nic nie trafia do firm trzecich – opis mówi to wprost.
 */
export default function CookieBanner() {
  const [open, setOpen] = useState(() => !getConsent())

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(CONSENT_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_EVENT, reopen)
  }, [])

  const choose = value => {
    setConsent(value)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="cookie-banner"
          role="dialog"
          aria-label="Ustawienia prywatności"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease }}
        >
          <div className="cookie-text">
            <strong>Statystyki odwiedzin</strong>
            <p>
              Strona zapisuje w przeglądarce losowy identyfikator, żeby policzyć unikalne wizyty,
              źródła wejść i czas na stronie. Dane zostają na moim serwerze, bez reklam i firm trzecich.
              Bez zgody liczę tylko anonimowe odsłony i pobrania.
            </p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="cookie-btn is-ghost" onClick={() => choose('denied')}>Tylko niezbędne</button>
            <button type="button" className="cookie-btn" onClick={() => choose('granted')}>Akceptuję</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
