import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CONSENT_EVENT, getConsent, setConsent } from '../lib/analytics'
import { ease } from '../lib/ui'
import { useT } from '../lib/i18n'

/**
 * Zgoda na statystyki. Bez niej strona liczy tylko anonimowe odsłony i
 * pobrania; po akceptacji zapamiętuje losowy identyfikator przeglądarki.
 * Nic nie trafia do firm trzecich – opis mówi to wprost.
 */
export default function CookieBanner() {
  const { t } = useT()
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
          aria-label={t('cookie.label')}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease }}
        >
          <div className="cookie-text">
            <strong>{t('cookie.title')}</strong>
            <p>{t('cookie.text')}</p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="cookie-btn is-ghost" onClick={() => choose('denied')}>{t('cookie.deny')}</button>
            <button type="button" className="cookie-btn" onClick={() => choose('granted')}>{t('cookie.accept')}</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
