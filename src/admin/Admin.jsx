import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ArrowUpRight, BarChart3, Boxes, Camera, Download, FileStack, Files, Inbox, LayoutDashboard, LoaderCircle,
  LockKeyhole, LogOut, MailCheck, MessageSquareText, RefreshCw, Save, Settings, ShieldCheck, Trash2,
} from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { Card, Empty, Notice, Text, Toaster, Toggle, toast } from './parts'
import PagesManager from './PagesManager'
import ProjectsManager from './ProjectsManager'
import ContentManager from './ContentManager'
import AnalyticsPanel from './AnalyticsPanel'
import DownloadsPanel from './DownloadsPanel'
import '../styles/admin.css'

/** Zakładka, jej adres pod /admin, nazwa i ikona. */
const TABS = [
  ['dashboard', '', 'Pulpit', LayoutDashboard],
  ['analytics', 'analityka', 'Analityka', BarChart3],
  ['submissions', 'zgloszenia', 'Zgłoszenia', MessageSquareText],
  ['projects', 'portfolio', 'Portfolio', Boxes],
  ['downloads', 'pobieranie', 'Pobieranie', Download],
  ['pages', 'podstrony', 'Podstrony', Files],
  ['content', 'tresci', 'Treści strony', FileStack],
  ['gallery', 'galeria', 'Galeria', Camera],
  ['inbox', 'odebrane', 'Odebrane', Inbox],
  ['outbox', 'wyslane', 'Wysłane', MailCheck],
  ['settings', 'poczta', 'Poczta', Settings],
]

/**
 * Każdy widok panelu ma własny adres: /admin/<zakładka>/<pozycja>. Pozycja to
 * slug edytowanej pracy albo podstrony (lub „en” dla angielskich treści), więc
 * link do konkretnego edytora można zapisać, odświeżyć i otworzyć w nowej karcie.
 */
function parseAdminPath(pathname = window.location.pathname) {
  const [, segment = '', ...rest] = pathname.replace(/^\/admin\/?/, '/').split('/')
  const found = TABS.find(([, slug]) => slug === decodeURIComponent(segment))
  return { tab: found ? found[0] : 'dashboard', item: decodeURIComponent(rest.join('/') || '') }
}

function adminPath(tab, item = '') {
  const slug = TABS.find(([id]) => id === tab)?.[1] || ''
  return ['/admin', slug, item && encodeURIComponent(item)].filter(Boolean).join('/')
}

const STATUS_LABEL = {
  new: 'Nowe', 'in-progress': 'W toku', closed: 'Zamknięte',
  sent: 'Wysłano', failed: 'Błąd', pending: 'Wysyłanie',
}

const EMPTY_SETTINGS = {
  fromName: '', ownerEmail: '', imapHost: '', imapPort: 993, imapSecure: true, imapUsername: '',
  smtpHost: '', smtpPort: 465, smtpSecure: true, smtpUsername: '', password: '', hasPassword: false,
}

function galleryReturnPath() {
  const next = new URLSearchParams(window.location.search).get('next') || ''
  return /^\/galeria\/admin(?:[/?#]|$)/.test(next) ? next : ''
}

function Status({ value }) {
  return <span className={`ap-status is-${value}`}>{STATUS_LABEL[value] || value}</span>
}

/* ── submissions ────────────────────────────────────────────────── */

const REQUEST_TYPE_LABEL = { bug: 'Zgłoszenie błędu', feature: 'Propozycja funkcjonalności', collaboration: 'Współpraca' }

function Submissions({ items, loading, onStatus, onDelete }) {
  const [filter, setFilter] = useState('all')
  const counts = {
    all: items.length,
    new: items.filter(item => item.status === 'new').length,
    'in-progress': items.filter(item => item.status === 'in-progress').length,
    closed: items.filter(item => item.status === 'closed').length,
  }
  const visible = filter === 'all' ? items : items.filter(item => item.status === filter)

  return (
    <div className="ap-stack">
      <div className="ap-filters">
        {[['all', 'Wszystkie'], ['new', 'Nowe'], ['in-progress', 'W toku'], ['closed', 'Zamknięte']].map(([id, label]) => (
          <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>
            {label} <b>{counts[id]}</b>
          </button>
        ))}
      </div>

      {!loading && visible.length === 0 && <Empty>Brak zgłoszeń w tym widoku.</Empty>}

      <div className="ap-stack">
        {visible.map(item => (
          <article className="ap-submission" key={item.id}>
            <header>
              <Status value={item.status} />
              <span>{formatDate(item.createdAt)}</span>
              <span>{item.contactMethod === 'phone' ? 'Odpowiedź telefoniczna' : 'Odpowiedź mailowa'}</span>
              {item.source === 'konfigurator' && <span className="ap-tag">z konfiguratora</span>}
              <button className="ap-icon-btn is-danger" onClick={() => onDelete(item)} aria-label="Usuń zgłoszenie">
                <Trash2 size={14} />
              </button>
            </header>

            <div className="ap-submission-grid">
              <div>
                <h3>{item.subject || (item.app ? REQUEST_TYPE_LABEL[item.requestType] : 'Nowy projekt')}</h3>
                {item.app && (
                  <div className="ap-chips"><span>{item.app}</span><span>{REQUEST_TYPE_LABEL[item.requestType]}</span></div>
                )}
                <p className="ap-strong">{item.name}{item.company ? ` · ${item.company}` : ''}</p>
                <p><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone ? ` · ${item.phone}` : ''}</p>
                {(item.budget || item.timeline) && (
                  <p className="ap-muted">{[item.budget, item.timeline].filter(Boolean).join(' · ')}</p>
                )}
                {item.scope?.length > 0 && (
                  <div className="ap-chips">{item.scope.map(scope => <span key={scope}>{scope}</span>)}</div>
                )}
              </div>
              <p className="ap-message">{item.message}</p>
            </div>

            <footer>
              {['new', 'in-progress', 'closed'].map(status => (
                <button
                  key={status}
                  className={item.status === status ? 'is-active' : ''}
                  onClick={() => onStatus(item.id, status)}
                >{STATUS_LABEL[status]}</button>
              ))}
              <a className="ap-reply" href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject || 'Twoje zapytanie'}`)}`}>
                Odpowiedz <ArrowUpRight size={13} />
              </a>
            </footer>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ── dashboard ──────────────────────────────────────────────────── */

function Dashboard({ submissions, pages, onTab }) {
  // onTab(tab, item) – pulpit linkuje prosto do edytora konkretnej podstrony.
  const stats = [
    ['Zgłoszenia', submissions.length, 'submissions'],
    ['Nowe zgłoszenia', submissions.filter(item => item.status === 'new').length, 'submissions'],
    ['Podstrony', pages.length, 'pages'],
    ['Opublikowane', pages.filter(page => page.published).length, 'pages'],
  ]

  return (
    <div className="ap-stack">
      <div className="ap-stats">
        {stats.map(([label, value, tab]) => (
          <button key={label} onClick={() => onTab(tab)}>
            <span>{label}</span>
            <b>{value}</b>
          </button>
        ))}
      </div>

      <div className="ap-two">
        <Card title="Ostatnie zgłoszenia" description="Pięć najnowszych wiadomości z formularza.">
          {submissions.slice(0, 5).map(item => (
            <button key={item.id} className="ap-row" onClick={() => onTab('submissions')}>
              <Status value={item.status} />
              <span className="ap-row-main"><b>{item.name}</b><i>{item.subject || (item.app ? `${item.app} – ${REQUEST_TYPE_LABEL[item.requestType]}` : 'Nowy projekt')}</i></span>
              <time>{formatDate(item.createdAt)}</time>
            </button>
          ))}
          {!submissions.length && <Empty>Pierwsze zapytanie pojawi się tutaj.</Empty>}
        </Card>

        <Card title="Twoje podstrony" description="Strony oferty tworzone w panelu.">
          {pages.slice(0, 6).map(page => (
            <button key={page.id} className="ap-row" onClick={() => onTab('pages', page.slug)}>
              <span className={`ap-dot ${page.published ? 'is-live' : ''}`} />
              <span className="ap-row-main"><b>{page.title}</b><i>/p/{page.slug}</i></span>
              <time>{page.published ? 'opublikowana' : 'szkic'}</time>
            </button>
          ))}
          {!pages.length && <Empty>Nie masz jeszcze podstron. Dodaj pierwszą w zakładce „Podstrony”.</Empty>}
        </Card>
      </div>
    </div>
  )
}

/* ── mail ───────────────────────────────────────────────────────── */

function MailSettings({ settings, setSettings, onSave, loading }) {
  const update = value => setSettings(current => ({ ...current, ...value }))

  return (
    <form className="ap-stack" onSubmit={onSave}>
      <Card title="Tożsamość nadawcy" description="Hasło jest szyfrowane przed zapisaniem. Zostaw puste, aby zachować obecne.">
        <div className="ap-grid-2">
          <Text label="Nazwa nadawcy" value={settings.fromName} onChange={fromName => update({ fromName })} />
          <Text label="Adres odbierający powiadomienia" type="email" value={settings.ownerEmail} onChange={ownerEmail => update({ ownerEmail })} placeholder="kontakt@twojadomena.pl" />
        </div>
      </Card>

      <div className="ap-two">
        <Card title="IMAP – poczta przychodząca">
          <Text label="Host" value={settings.imapHost} onChange={imapHost => update({ imapHost })} placeholder="imap.example.com" />
          <div className="ap-grid-2">
            <Text label="Port" type="number" value={settings.imapPort} onChange={imapPort => update({ imapPort: Number(imapPort) || 993 })} />
            <Text label="Użytkownik" value={settings.imapUsername} onChange={imapUsername => update({ imapUsername })} />
          </div>
          <Toggle label="Połączenie szyfrowane TLS" checked={settings.imapSecure} onChange={imapSecure => update({ imapSecure })} />
        </Card>

        <Card title="SMTP – poczta wychodząca">
          <Text label="Host" value={settings.smtpHost} onChange={smtpHost => update({ smtpHost })} placeholder="smtp.example.com" />
          <div className="ap-grid-2">
            <Text label="Port" type="number" value={settings.smtpPort} onChange={smtpPort => update({ smtpPort: Number(smtpPort) || 465 })} />
            <Text label="Użytkownik / adres nadawcy" value={settings.smtpUsername} onChange={smtpUsername => update({ smtpUsername })} />
          </div>
          <Toggle label="Połączenie szyfrowane TLS" checked={settings.smtpSecure} onChange={smtpSecure => update({ smtpSecure })} />
        </Card>
      </div>

      <Card title="Hasło skrzynki">
        <Text
          label={settings.hasPassword ? 'Nowe hasło (opcjonalnie)' : 'Hasło'}
          type="password"
          value={settings.password}
          onChange={password => update({ password })}
          placeholder={settings.hasPassword ? 'Zapisane – wpisz tylko, aby zmienić' : 'Hasło lub hasło aplikacji'}
        />
        <button className="ap-btn ap-btn-primary" type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Zapisz ustawienia
        </button>
      </Card>
    </form>
  )
}

/* ── authentication ─────────────────────────────────────────────── */

function AuthScreen({ mode, onAuthenticated }) {
  const setup = mode === 'setup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (setup && password !== confirmation) {
      setError('Hasła nie są identyczne.')
      return
    }
    setLoading(true)
    try {
      const result = await api(`/api/auth/${setup ? 'setup' : 'login'}`, json('POST', { username, password }))
      onAuthenticated(result.admin)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ap-auth">
      <form className="ap-auth-card" onSubmit={submit}>
        <section className="ap-auth-intro">
          <a className="ap-auth-brand" href="/">
            <img src="/assets/brand/favicon-r-180.png" alt="" />
            <span>Adam Rędzikowski<i>Panel administracyjny</i></span>
          </a>
          <div className="ap-auth-promise">
            <span>{setup ? 'Pierwsza konfiguracja' : 'Prywatna strefa'}</span>
            <h1>{setup ? 'Ustaw dostęp po swojemu.' : 'Jedno konto. Cały panel.'}</h1>
            <p>Treści strony i galeria działają w jednej, wspólnej sesji administratora.</p>
          </div>
          <ul className="ap-auth-facts">
            <li><ShieldCheck size={14} /> Bez adresu e-mail</li>
            <li><Camera size={14} /> Ten sam dostęp do galerii</li>
          </ul>
        </section>

        <section className="ap-auth-form">
          <div className="ap-auth-heading">
            <span>{setup ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}</span>
            <div>
              <h2>{setup ? 'Utwórz administratora' : 'Zaloguj się'}</h2>
              <p>{setup
                ? 'Podaj nazwę i mocne hasło. To wszystko, czego potrzebujesz.'
                : 'Użyj danych ustawionych podczas pierwszej konfiguracji.'}</p>
            </div>
          </div>

          <div className="ap-auth-fields">
            {error && <Notice tone="error">{error}</Notice>}

            <label className="ap-field">
              <span>Nazwa administratora</span>
              <input
                autoComplete="username"
                autoFocus
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder="np. adam"
                minLength={3}
                maxLength={60}
                required
              />
            </label>

            <label className="ap-field">
              <span>Hasło</span>
              <input
                type="password"
                autoComplete={setup ? 'new-password' : 'current-password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                minLength={setup ? 10 : undefined}
                maxLength={200}
                required
              />
              {setup && <i>Minimum 10 znaków. Nie używaj hasła z innych serwisów.</i>}
            </label>

            {setup && (
              <label className="ap-field">
                <span>Powtórz hasło</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                  minLength={10}
                  maxLength={200}
                  required
                />
              </label>
            )}

            <button className="ap-btn ap-btn-primary ap-auth-submit" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : setup ? <ShieldCheck size={16} /> : <LockKeyhole size={16} />}
              {setup ? 'Utwórz konto i otwórz panel' : 'Otwórz panel'}
            </button>
          </div>
        </section>
      </form>
    </main>
  )
}

function GalleryManager() {
  return (
    <div className="ap-gallery-manager">
      <iframe className="ap-gallery-frame" title="Zarządzanie galerią" src="/galeria/admin?embedded=1" />
    </div>
  )
}

/* ── shell ──────────────────────────────────────────────────────── */

function AdminPanel({ admin, onLogout }) {
  const [location, setLocation] = useState(() => parseAdminPath())
  const { tab, item } = location
  const [submissions, setSubmissions] = useState([])
  const [pages, setPages] = useState([])
  const [inbox, setInbox] = useState([])
  const [outbox, setOutbox] = useState([])
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const notify = useCallback(message => toast.success(message), [])

  const run = useCallback(async (action, success = '') => {
    setLoading(true)
    try {
      await action()
      if (success) notify(success)
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [notify])

  const loadOverview = useCallback(() => run(async () => {
    const [submissionList, pageList] = await Promise.all([
      api('/api/admin/submissions'),
      api('/api/admin/pages'),
    ])
    setSubmissions(submissionList)
    setPages(pageList)
  }), [run])

  useEffect(() => { loadOverview() }, [loadOverview])

  useEffect(() => {
    const onPop = () => setLocation(parseAdminPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Pozycja w edytorze (praca, podstrona, język treści) – podmienia adres bez
  // nowego wpisu w historii, żeby „wstecz” wracało do poprzedniej zakładki.
  const selectItem = useCallback(next => {
    const target = adminPath(tab, next)
    if (target !== window.location.pathname) window.history.replaceState({}, '', target)
    setLocation(current => (current.item === (next || '') ? current : { ...current, item: next || '' }))
  }, [tab])

  const refresh = () => {
    if (tab === 'dashboard') return loadOverview()
    if (tab === 'analytics' || tab === 'downloads') return setRefreshKey(value => value + 1)
    if (tab === 'submissions') return run(async () => setSubmissions(await api('/api/admin/submissions')))
    if (tab === 'inbox') return run(async () => setInbox(await api('/api/admin/inbox')))
    if (tab === 'outbox') return run(async () => setOutbox(await api('/api/admin/outbox')))
    if (tab === 'settings') return run(async () => {
      const loaded = await api('/api/admin/settings')
      setSettings(current => ({ ...current, ...loaded, password: '' }))
    })
    return undefined
  }

  const loadTab = next => {
    if (next === 'inbox' && !inbox.length) run(async () => setInbox(await api('/api/admin/inbox')))
    if (next === 'outbox' && !outbox.length) run(async () => setOutbox(await api('/api/admin/outbox')))
    if (next === 'settings') run(async () => {
      const loaded = await api('/api/admin/settings')
      setSettings(current => ({ ...current, ...loaded, password: '' }))
    })
    if (next === 'dashboard') loadOverview()
  }

  const chooseTab = (next, nextItem = '') => {
    const target = adminPath(next, nextItem)
    if (target !== window.location.pathname) window.history.pushState({}, '', target)
    setLocation({ tab: next, item: nextItem })
    loadTab(next)
  }

  // Wejście z adresu (odświeżenie, link, „wstecz”) też dociąga dane zakładki.
  useEffect(() => { if (tab !== 'dashboard') loadTab(tab) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeStatus = (id, status) => run(async () => {
    const updated = await api(`/api/admin/submissions/${id}`, json('PATCH', { status }))
    setSubmissions(current => current.map(item => (item.id === id ? updated : item)))
  })

  const deleteSubmission = item => {
    if (!window.confirm(`Usunąć zgłoszenie od ${item.name}?`)) return
    run(async () => {
      await api(`/api/admin/submissions/${item.id}`, { method: 'DELETE' })
      setSubmissions(current => current.filter(entry => entry.id !== item.id))
    }, 'Zgłoszenie zostało usunięte.')
  }

  const saveSettings = event => {
    event.preventDefault()
    run(async () => {
      const updated = await api('/api/admin/settings', json('PUT', settings))
      setSettings(current => ({ ...current, ...updated, password: '' }))
    }, 'Ustawienia poczty zostały bezpiecznie zapisane.')
  }

  const active = TABS.find(entry => entry[0] === tab)

  useEffect(() => {
    document.title = `${active?.[2] || 'Panel'}${item ? ` · ${item}` : ''} – Panel administracyjny`
  }, [active, item])

  return (
    <div className="ap-shell">
      <aside className="ap-sidebar">
        <a className="ap-brand" href="/">
          <b>AR</b>
          <span>Studio<i>Control</i></span>
        </a>

        <nav>
          {TABS.map(([id, , label, Icon]) => (
            <a
              key={id}
              href={adminPath(id)}
              className={tab === id ? 'is-active' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={event => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
                event.preventDefault()
                chooseTab(id)
              }}
            >
              <Icon size={17} /><span>{label}</span>
            </a>
          ))}
        </nav>

        <a className="ap-back" href="/"><ArrowLeft size={15} /> <span>Wróć na stronę</span></a>
      </aside>

      <main className={`ap-main ${tab === 'gallery' ? 'is-gallery' : ''}`}>
        {tab !== 'gallery' && <header className="ap-header">
          <div>
            <h1>{active?.[2]}</h1>
          </div>
          <div className="ap-header-actions">
            <a className="ap-btn ap-btn-ghost" href="/" target="_blank" rel="noreferrer">
              Zobacz stronę <ArrowUpRight size={14} />
            </a>
            <button className="ap-btn ap-btn-ghost" onClick={refresh} disabled={loading}>
              <RefreshCw className={loading ? 'spin' : ''} size={14} /> Odśwież
            </button>
            <button className="ap-btn ap-btn-ghost" onClick={onLogout}>
              <LogOut size={14} /> Wyloguj
            </button>
          </div>
        </header>}

        <motion.div className={`ap-body ${tab === 'gallery' ? 'is-gallery' : ''}`} key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'dashboard' && <Dashboard submissions={submissions} pages={pages} onTab={chooseTab} />}

          {tab === 'submissions' && (
            <Submissions items={submissions} loading={loading} onStatus={changeStatus} onDelete={deleteSubmission} />
          )}

          {tab === 'analytics' && <AnalyticsPanel key={refreshKey} />}
          {tab === 'projects' && <ProjectsManager notify={notify} item={item} onItem={selectItem} />}

          {tab === 'downloads' && <DownloadsPanel key={refreshKey} />}
          {tab === 'pages' && <PagesManager notify={notify} item={item} onItem={selectItem} />}

          {tab === 'content' && <ContentManager notify={notify} item={item} onItem={selectItem} />}

          {tab === 'gallery' && <GalleryManager />}

          {tab === 'inbox' && (
            <div className="ap-stack">
              {!loading && !inbox.length && <Empty>Brak wiadomości albo skrzynka IMAP nie została jeszcze skonfigurowana.</Empty>}
              {inbox.map(message => (
                <details className="ap-mail" key={`${message.uid}-${message.date}`}>
                  <summary>
                    <span className={`ap-dot ${message.seen ? '' : 'is-live'}`} />
                    <span className="ap-row-main"><b>{message.subject}</b><i>{message.from}</i></span>
                    <time>{formatDate(message.date)}</time>
                  </summary>
                  <div className="ap-mail-body">
                    <span>Do: {message.to}</span>
                    <p>{message.text || 'Wiadomość nie zawiera podglądu tekstowego.'}</p>
                  </div>
                </details>
              ))}
            </div>
          )}

          {tab === 'outbox' && (
            <div className="ap-stack">
              {!loading && !outbox.length && <Empty>Historia potwierdzeń i powiadomień pojawi się tutaj.</Empty>}
              {outbox.map(message => (
                <article className="ap-outbox" key={message.id}>
                  <Status value={message.status} />
                  <span className="ap-row-main">
                    <b>{message.subject}</b>
                    <i>Do: {message.to} · {message.kind === 'confirmation' ? 'potwierdzenie dla klienta' : 'powiadomienie wewnętrzne'}</i>
                  </span>
                  <time>{formatDate(message.createdAt)}</time>
                  {message.error && <p className="ap-error-text">{message.error}</p>}
                </article>
              ))}
            </div>
          )}

          {tab === 'settings' && (
            <MailSettings settings={settings} setSettings={setSettings} onSave={saveSettings} loading={loading} />
          )}
        </motion.div>

        {loading && (
          <div className="ap-loading"><LoaderCircle className="spin" size={15} /> Pracuję…</div>
        )}
        <Toaster />
      </main>
    </div>
  )
}

export default function Admin() {
  const [auth, setAuth] = useState({ loading: true, mode: 'login', authenticated: false, admin: null })
  const [error, setError] = useState('')

  const check = useCallback(async () => {
    setError('')
    try {
      const status = await api('/api/auth/status')
      const next = galleryReturnPath()
      if (status.authenticated && next) {
        window.location.replace(next)
        return
      }
      setAuth({ loading: false, ...status })
    } catch (requestError) {
      setError(requestError.message)
      setAuth(current => ({ ...current, loading: false }))
    }
  }, [])

  useEffect(() => { check() }, [check])
  useEffect(() => {
    const unauthorized = () => setAuth(current => ({ ...current, authenticated: false, admin: null, mode: 'login' }))
    window.addEventListener('admin:unauthorized', unauthorized)
    return () => window.removeEventListener('admin:unauthorized', unauthorized)
  }, [])

  const logout = async () => {
    await api('/api/auth/logout', json('POST', {})).catch(() => undefined)
    setAuth(current => ({ ...current, authenticated: false, admin: null, mode: 'login' }))
  }

  if (auth.loading) {
    return <div className="page-state"><LoaderCircle className="spin" size={26} /><span>Sprawdzam dostęp</span></div>
  }
  if (error) {
    return <main className="ap-auth"><div className="ap-auth-card"><Notice tone="error">{error}</Notice><button className="ap-btn" onClick={check}>Spróbuj ponownie</button></div></main>
  }
  if (!auth.authenticated) {
    return <AuthScreen mode={auth.mode} onAuthenticated={admin => {
      const next = galleryReturnPath()
      if (next) window.location.replace(next)
      else setAuth({ loading: false, mode: 'login', authenticated: true, admin })
    }} />
  }
  return <AdminPanel admin={auth.admin} onLogout={logout} />
}
