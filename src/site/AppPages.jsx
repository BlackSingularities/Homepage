import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react'
import { PRIVACY, PRIVACY_VERSION, PRIVACY_VERSION_EN } from './privacy-gran'
import '../styles/app-pages.css'

/**
 * Strony aplikacji pod /aplikacje/<aplikacja>/…: polityka prywatności, aktywacja konta
 * (link z wiadomości) i ustawienie nowego hasła. Język: polski albo angielski (przełącznik,
 * domyślnie język przeglądarki).
 */

const APPS = { gran: { id: 'gran-3d', name: 'GRAŃ' } }

const COPY = {
  pl: {
    activating: 'Aktywuję konto…',
    activated: name => `Gotowe, ${name}! Konto jest aktywne.`,
    activatedLead: app => `Wróć do aplikacji ${app} i zaloguj się tym adresem e-mail i hasłem. Możesz już dodawać punkty, komentarze i zdjęcia.`,
    failed: 'Nie udało się aktywować konta',
    noToken: 'W linku brakuje kodu. Otwórz link z wiadomości jeszcze raz albo poproś w aplikacji o nowy.',
    resetTitle: 'Nowe hasło',
    resetLead: app => `Ustaw nowe hasło do konta w aplikacji ${app}. Po zmianie zaloguj się ponownie na wszystkich urządzeniach.`,
    password: 'Nowe hasło (co najmniej 8 znaków)',
    repeat: 'Powtórz hasło',
    save: 'Zapisz hasło',
    mismatch: 'Hasła się różnią.',
    short: 'Hasło musi mieć co najmniej 8 znaków.',
    resetDone: app => `Hasło zmienione. Zaloguj się w aplikacji ${app} nowym hasłem.`,
    privacyLink: 'Polityka prywatności',
    version: 'Wersja z',
    support: 'Obsługa aplikacji',
    notFound: 'Nie ma takiej strony aplikacji.',
  },
  en: {
    activating: 'Activating your account…',
    activated: name => `Done, ${name}! Your account is active.`,
    activatedLead: app => `Go back to ${app} and sign in with this e-mail and password. You can now add points, comments and photos.`,
    failed: 'Could not activate the account',
    noToken: 'The link has no code. Open the link from the e-mail again or request a new one in the app.',
    resetTitle: 'New password',
    resetLead: app => `Set a new password for your ${app} account. Afterwards sign in again on all your devices.`,
    password: 'New password (at least 8 characters)',
    repeat: 'Repeat password',
    save: 'Save password',
    mismatch: 'Passwords do not match.',
    short: 'The password must have at least 8 characters.',
    resetDone: app => `Password changed. Sign in to ${app} with the new password.`,
    privacyLink: 'Privacy policy',
    version: 'Version of',
    support: 'App support',
    notFound: 'There is no such app page.',
  },
}

function initialLang() {
  const asked = new URLSearchParams(window.location.search).get('lang')
  if (asked === 'en' || asked === 'pl') return asked
  return (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en'
}

async function post(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
  return payload
}

function LangSwitch({ lang, onLang }) {
  return (
    <div className="ax-lang" role="group" aria-label="Język / Language">
      {['pl', 'en'].map(code => (
        <button key={code} type="button" className={lang === code ? 'is-active' : ''} onClick={() => onLang(code)}>{code.toUpperCase()}</button>
      ))}
    </div>
  )
}

function Privacy({ app, lang, support }) {
  const copy = PRIVACY[lang]
  const t = COPY[lang]
  useEffect(() => { document.title = `${copy.title} – redzikowski.com` }, [copy.title])
  return (
    <article className="ax-doc">
      <p className="ax-kicker"><ShieldCheck size={15} /> {app.name}</p>
      <h1>{copy.title}</h1>
      <p className="ax-meta">{t.version} {lang === 'pl' ? PRIVACY_VERSION : PRIVACY_VERSION_EN}</p>
      <p className="ax-lead">{copy.lead}</p>
      {support && <p className="ax-support">{t.support}: <a href={`mailto:${support}`}>{support}</a></p>}
      {copy.sections.map(section => (
        <section key={section.h}>
          <h2>{section.h}</h2>
          {section.p.map((text, index) => <p key={index}>{text}</p>)}
        </section>
      ))}
    </article>
  )
}

function Activate({ app, lang }) {
  const t = COPY[lang]
  const [state, setState] = useState({ busy: true })
  useEffect(() => {
    const tokenValue = new URLSearchParams(window.location.search).get('token')
    if (!tokenValue) return setState({ error: t.noToken })
    post(`/api/apps/${app.id}/activate`, { token: tokenValue })
      .then(result => setState({ done: result }))
      .catch(error => setState({ error: error.message }))
    return undefined
  }, [app.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ax-card">
      {state.busy && <p className="ax-status"><LoaderCircle className="spin" size={22} /> {t.activating}</p>}
      {state.done && (
        <>
          <CheckCircle2 className="ax-icon is-ok" size={40} />
          <h1>{t.activated(state.done.name)}</h1>
          <p>{t.activatedLead(app.name)}</p>
        </>
      )}
      {state.error && (
        <>
          <TriangleAlert className="ax-icon is-warn" size={40} />
          <h1>{t.failed}</h1>
          <p>{state.error}</p>
        </>
      )}
    </div>
  )
}

function Reset({ app, lang }) {
  const t = COPY[lang]
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [state, setState] = useState({})
  const tokenValue = new URLSearchParams(window.location.search).get('token') || ''

  const submit = async event => {
    event.preventDefault()
    if (password.length < 8) return setState({ error: t.short })
    if (password !== repeat) return setState({ error: t.mismatch })
    setState({ busy: true })
    try {
      await post(`/api/apps/${app.id}/reset`, { token: tokenValue, password })
      setState({ done: true })
    } catch (error) {
      setState({ error: error.message })
    }
    return undefined
  }

  if (!tokenValue) return <div className="ax-card"><TriangleAlert className="ax-icon is-warn" size={40} /><p>{t.noToken}</p></div>
  if (state.done) return <div className="ax-card"><CheckCircle2 className="ax-icon is-ok" size={40} /><h1>{t.resetDone(app.name)}</h1></div>
  return (
    <form className="ax-card" onSubmit={submit}>
      <KeyRound className="ax-icon" size={36} />
      <h1>{t.resetTitle}</h1>
      <p>{t.resetLead(app.name)}</p>
      <label>{t.password}<input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required /></label>
      <label>{t.repeat}<input type="password" autoComplete="new-password" value={repeat} onChange={event => setRepeat(event.target.value)} minLength={8} required /></label>
      {state.error && <p className="ax-error">{state.error}</p>}
      <button className="btn btn-primary" type="submit" disabled={state.busy}>{state.busy ? <LoaderCircle className="spin" size={16} /> : null} {t.save}</button>
    </form>
  )
}

export default function AppPages({ slug, view, onNavigate }) {
  const [lang, setLang] = useState(initialLang)
  const [support, setSupport] = useState('')
  const app = APPS[slug]

  useEffect(() => {
    if (!app) return
    fetch(`/api/apps/${app.id}/info`).then(response => response.json()).then(info => setSupport(info.supportEmail || '')).catch(() => undefined)
  }, [app])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [view])

  if (!app) return <main className="page-state"><p>{COPY[lang].notFound}</p></main>
  const privacyHref = `/aplikacje/${slug}/prywatnosc`

  return (
    <main className="page-view ax-page">
      <div className="ax-wrap">
        <div className="ax-bar">
          <LangSwitch lang={lang} onLang={setLang} />
        </div>
        {view === 'privacy' && <Privacy app={app} lang={lang} support={support} />}
        {view === 'activate' && <Activate app={app} lang={lang} />}
        {view === 'reset' && <Reset app={app} lang={lang} />}
        {view !== 'privacy' && (
          <p className="ax-foot">
            <a href={privacyHref} onClick={event => { event.preventDefault(); onNavigate(privacyHref) }}>{COPY[lang].privacyLink}</a>
          </p>
        )}
      </div>
    </main>
  )
}
