import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import {
  AppWindow, ArrowLeft, ArrowUpRight, BarChart3, Bell, Boxes, Bug, Lightbulb, Camera, Download, Files, FlaskConical, LayoutDashboard, Link2, LoaderCircle,
  LockKeyhole, LogOut, Mail, MapPin, MessageSquareText, Package, RefreshCw, Save, Settings, ShieldCheck, Trash2, Type,
} from 'lucide-react'
import { meterTone, readiness } from './readiness'
import { api, formatDate, json } from '../lib/api'
import { Card, Empty, Notice, Text, Toaster, Toggle, toast } from './parts'
import PagesManager from './PagesManager'
import ProjectsManager from './ProjectsManager'
import ContentManager from './ContentManager'
import AnalyticsPanel from './AnalyticsPanel'
import DownloadsPanel from './DownloadsPanel'
import ResourcesManager from './ResourcesManager'
import LinksManager from './LinksManager'
import TestersPanel from './TestersPanel'
import AppFeedbackPanel from './AppFeedbackPanel'
import AppsPanel from './AppsPanel'
import MailPanel from './MailPanel'
import MailComposer, { quoteBlock } from './MailComposer'
import '../styles/admin.css'

/**
 * Zakładka, jej adres pod /admin, nazwa, ikona, grupa w menu i jedno zdanie
 * pod tytułem. Kolejność: to, co przychodzi codziennie (zapytania, poczta),
 * potem treści strony, potem aplikacje. Ustawienia poczty są w stopce menu.
 */
const TABS = [
  ['dashboard', '', 'Pulpit', LayoutDashboard, '', 'Co wymaga uwagi i w jakim stanie jest portfolio.'],
  ['submissions', 'zgloszenia', 'Zapytania', MessageSquareText, '', 'Wiadomości z formularza kontaktowego na stronie.'],
  ['mail', 'poczta', 'Poczta', Mail, '', 'Skrzynka odbiorcza i wysłane wiadomości.'],
  ['analytics', 'analityka', 'Analityka', BarChart3, '', 'Ruch na stronie, źródła wejść i pobrania aplikacji.'],
  ['projects', 'portfolio', 'Portfolio', Boxes, 'Strona', 'Prace: treść, zdjęcia, pliki do pobrania i SEO.'],
  ['pages', 'podstrony', 'Podstrony', Files, 'Strona', 'Strony oferty pod adresem /p/…'],
  ['content', 'tresci', 'Treści strony', Type, 'Strona', 'Teksty strony głównej i katalogu, po polsku i angielsku.'],
  ['links', 'przydatne-linki', 'Przydatne linki', Link2, 'Strona', 'Polecane strony pokazywane w /przydatne-linki.'],
  ['resources', 'do-pobrania', 'Do pobrania', Package, 'Strona', 'Materiały i presety pod /do-pobrania.'],
  ['gallery', 'galeria', 'Galeria', Camera, 'Strona', ''],
  ['apps', 'aplikacje', 'Przegląd aplikacji', AppWindow, 'Aplikacje', 'Konta użytkowników i dane wysyłane z aplikacji.'],
  ['bugReports', 'raporty-bledow', 'Raporty błędów', Bug, 'Aplikacje', 'Awarie zgłoszone automatycznie przez aplikacje.'],
  ['appFeedback', 'sugestie', 'Sugestie z aplikacji', Lightbulb, 'Aplikacje', 'Pomysły i uwagi wysłane z wnętrza aplikacji.'],
  ['testers', 'testerzy', 'Testerzy', FlaskConical, 'Aplikacje', 'Zapisy do testów wersji przedpremierowych.'],
  ['downloads', 'pobieranie', 'Pobrania', Download, 'Aplikacje', 'Ile razy pobrano każdy plik.'],
  ['settings', 'ustawienia-poczty', 'Ustawienia poczty', Settings, 'Ustawienia', 'Serwery IMAP i SMTP oraz dane nadawcy.'],
]

/** Zakładki, które przycisk „Odśwież” umie przeładować. */
const REFRESHABLE = new Set(['dashboard', 'submissions', 'mail', 'analytics', 'apps', 'bugReports', 'appFeedback', 'testers', 'downloads', 'settings'])

/** Publiczny adres tego, co jest otwarte w panelu – „Zobacz na stronie”. */
function publicPathFor(tab, item) {
  if (tab === 'projects') return item ? `/portfolio/${item}` : '/portfolio'
  if (tab === 'pages') return item ? `/p/${item}` : '/'
  if (tab === 'links') return '/przydatne-linki'
  if (tab === 'resources') return '/do-pobrania'
  if (tab === 'content' && item === 'en') return '/en'
  return '/'
}

/** Podsekcje „Zarządzania aplikacjami” w menu (adres /admin/aplikacje/<slug>). */
const APP_LINKS = [['gran', 'Grań', MapPin]]

/**
 * Każdy widok panelu ma własny adres: /admin/<zakładka>/<pozycja>. Pozycja to
 * slug edytowanej pracy albo podstrony (lub „en” dla angielskich treści), więc
 * link do konkretnego edytora można zapisać, odświeżyć i otworzyć w nowej karcie.
 */
function parseAdminPath(pathname = window.location.pathname) {
  const [, segment = '', ...rest] = pathname.replace(/^\/admin\/?/, '/').split('/')
  // Dawne adresy skrzynek prowadzą do wspólnej Poczty.
  const slug = ['odebrane', 'wyslane'].includes(segment) ? 'poczta' : decodeURIComponent(segment)
  // Dawna zakładka „Punkty na mapie” jest teraz częścią aplikacji GRAŃ.
  if (slug === 'punkty-na-mapie') return { tab: 'apps', item: 'gran/punkty' }
  const found = TABS.find(([, entry]) => entry === slug)
  return { tab: found ? found[0] : 'dashboard', item: decodeURIComponent(rest.join('/') || '') }
}

function adminPath(tab, item = '') {
  const slug = TABS.find(([id]) => id === tab)?.[1] || ''
  return ['/admin', slug, item && item.split('/').map(encodeURIComponent).join('/')].filter(Boolean).join('/')
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

function Submissions({ items, loading, onStatus, onDelete, onReply }) {
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
                <p>{item.email}{item.phone ? ` · ${item.phone}` : ''}</p>
                {(item.budget || item.timeline) && (
                  <p className="ap-muted">{[item.budget, item.timeline].filter(Boolean).join(' · ')}</p>
                )}
                {item.scope?.length > 0 && (
                  <div className="ap-chips">{item.scope.map(scope => <span key={scope}>{scope}</span>)}</div>
                )}
              </div>
              <div className="ap-stack">
                <p className="ap-message">{item.message}</p>
                {item.replies?.map(reply => (
                  <p className="ap-muted" key={reply.at}>Odpowiedź wysłana {formatDate(reply.at)} do {reply.to}</p>
                ))}
              </div>
            </div>

            <footer>
              {['new', 'in-progress', 'closed'].map(status => (
                <button
                  key={status}
                  className={item.status === status ? 'is-active' : ''}
                  onClick={() => onStatus(item.id, status)}
                >{STATUS_LABEL[status]}</button>
              ))}
              <button className="ap-reply" onClick={() => onReply(item)}>
                Odpowiedz <ArrowUpRight size={13} />
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ── dashboard ──────────────────────────────────────────────────── */

function Dashboard({ submissions, pages, projects, unread, onTab }) {
  // onTab(tab, item) – pulpit linkuje prosto do edytora konkretnej pracy albo podstrony.
  const fresh = submissions.filter(item => item.status === 'new').length
  const scored = projects.map(project => ({ project, ...readiness(project) }))
  const average = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : 0
  const weak = scored.filter(item => item.score < 85).sort((a, b) => a.score - b.score)
  const drafts = projects.filter(project => project.published === false).length

  const kpis = [
    ['Nowe zapytania', fresh, fresh > 0, fresh ? 'czekają na odpowiedź' : 'wszystko obsłużone', () => onTab('submissions')],
    ['Powiadomienia', unread, unread > 0, unread ? 'raporty, sugestie, testerzy' : 'nic nowego', () => onTab(unread ? 'bugReports' : 'dashboard')],
    ['Prace w portfolio', projects.length - drafts, false, drafts ? `i ${drafts} w szkicu` : 'wszystkie opublikowane', () => onTab('projects')],
    ['Gotowość SEO', `${average}%`, false, weak.length ? `${weak.length} do dopracowania` : 'wszystkie gotowe', () => onTab('projects')],
  ]

  return (
    <div className="ap-dash">
      <div className="ap-dash-kpis">
        {kpis.map(([label, value, alert, note, open]) => (
          <button key={label} type="button" onClick={open}>
            {label}
            <b className={alert ? 'is-alert' : ''}>{value}</b>
            <small>{note}</small>
          </button>
        ))}
      </div>

      <div className="ap-dash-grid">
        <Card title="Prace do dopracowania" description="Najsłabiej przygotowane wpisy. Kliknij, żeby otworzyć edytor.">
          {weak.slice(0, 8).map(({ project, score, checks }) => (
            <button key={project.id} type="button" className="ap-readiness-row" onClick={() => onTab('projects', project.slug)}>
              {project.icon ? <img src={project.icon} alt="" /> : <i className="ap-readiness-blank" />}
              <span>
                <strong>{project.name}</strong>
                <small>Brakuje: {checks.filter(check => !check.ok).map(check => check.label.toLowerCase()).join(', ')}</small>
              </span>
              <span className={`ap-meter ${meterTone(score)}`} aria-label={`Gotowość ${score}%`}><i style={{ '--value': `${score}%` }} />{score}%</span>
            </button>
          ))}
          {!weak.length && <Empty>Wszystkie prace mają komplet treści i SEO.</Empty>}
        </Card>

        <div className="ap-dash-col">
        <Card title="Ostatnie zapytania" description="Pięć najnowszych wiadomości z formularza.">
          {submissions.slice(0, 5).map(item => (
            <button key={item.id} className="ap-row" onClick={() => onTab('submissions')}>
              <Status value={item.status} />
              <span className="ap-row-main"><b>{item.name}</b><i>{item.subject || (item.app ? `${item.app} – ${REQUEST_TYPE_LABEL[item.requestType]}` : 'Nowy projekt')}</i></span>
              <time>{formatDate(item.createdAt)}</time>
            </button>
          ))}
          {!submissions.length && <Empty>Pierwsze zapytanie pojawi się tutaj.</Empty>}
        </Card>

        <Card title="Podstrony" description="Strony oferty tworzone w panelu.">
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

/* ── powiadomienia ──────────────────────────────────────────────── */

const NOTIFICATION_LABEL = {
  submissions: 'Zapytania', bugReports: 'Raporty błędów', appFeedback: 'Sugestie z aplikacji', apps: 'Punkty na mapie (GRAŃ)', testers: 'Testerzy', mail: 'Poczta',
}

function NotificationBell({ data, onOpen }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const total = Object.values(data.counts).reduce((sum, value) => sum + value, 0)

  useEffect(() => {
    if (!open) return undefined
    const onClick = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    const onKey = event => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (tab, item = tab === 'apps' ? 'gran/punkty' : '') => { setOpen(false); onOpen(tab, item) }
  const groups = Object.entries(data.counts).filter(([, count]) => count > 0)

  return (
    <div className="ap-bell" ref={root}>
      <button
        className="ap-btn ap-btn-sm"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={total ? `Powiadomienia: ${total}` : 'Powiadomienia'}
      >
        <Bell size={14} />
        {total > 0 && <b className="ap-count">{total > 99 ? '99+' : total}</b>}
      </button>
      {open && (
        <div className="ap-bell-panel">
          {!total && <p className="ap-bell-empty">Nic nowego.</p>}
          {groups.length > 0 && (
            <div className="ap-bell-groups">
              {groups.map(([tab, count]) => (
                <button key={tab} onClick={() => go(tab)}>{NOTIFICATION_LABEL[tab]} <b className="ap-count">{count}</b></button>
              ))}
            </div>
          )}
          {data.items.map(entry => (
            <button className="ap-bell-item" key={entry.id} onClick={() => go(entry.tab, entry.item)}>
              <b>{entry.title}</b>
              <span>{entry.detail}</span>
              <time>{formatDate(entry.createdAt)}</time>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── shell ──────────────────────────────────────────────────────── */

function AdminPanel({ admin, onLogout }) {
  const [location, setLocation] = useState(() => parseAdminPath())
  const { tab, item } = location
  const [submissions, setSubmissions] = useState([])
  const [pages, setPages] = useState([])
  const [projects, setProjects] = useState([])
  const [compose, setCompose] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [mailChange, setMailChange] = useState(0)
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [notifications, setNotifications] = useState({ counts: {}, items: [] })

  // Błąd odpytywania nie zasługuje na komunikat – następna próba za minutę.
  const loadNotifications = useCallback(() => {
    api('/api/admin/notifications').then(setNotifications).catch(() => undefined)
  }, [])

  useEffect(() => {
    loadNotifications()
    const timer = setInterval(() => { if (!document.hidden) loadNotifications() }, 60 * 1000)
    document.addEventListener('visibilitychange', loadNotifications)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', loadNotifications)
    }
  }, [loadNotifications])

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
    const [submissionList, pageList, projectList] = await Promise.all([
      api('/api/admin/submissions'),
      api('/api/admin/pages'),
      api('/api/admin/projects'),
    ])
    setSubmissions(submissionList)
    setPages(pageList)
    setProjects(projectList.projects)
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
    loadNotifications()
    if (tab === 'testers' || tab === 'bugReports' || tab === 'appFeedback' || tab === 'apps') return setRefreshKey(value => value + 1)
    if (tab === 'dashboard') return loadOverview()
    if (tab === 'analytics' || tab === 'downloads') return setRefreshKey(value => value + 1)
    if (tab === 'submissions') return run(async () => setSubmissions(await api('/api/admin/submissions')))
    if (tab === 'mail') return setRefreshKey(value => value + 1)
    if (tab === 'settings') return run(async () => {
      const loaded = await api('/api/admin/settings')
      setSettings(current => ({ ...current, ...loaded, password: '' }))
    })
    return undefined
  }

  const loadTab = next => {
    if (next === 'submissions') run(async () => setSubmissions(await api('/api/admin/submissions')))
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
    loadNotifications()
  })

  const deleteSubmission = item => {
    if (!window.confirm(`Usunąć zgłoszenie od ${item.name}?`)) return
    run(async () => {
      await api(`/api/admin/submissions/${item.id}`, { method: 'DELETE' })
      setSubmissions(current => current.filter(entry => entry.id !== item.id))
      loadNotifications()
    }, 'Zgłoszenie zostało usunięte.')
  }

  const startCompose = useCallback(draft => {
    setCompose(draft)
    if (!identity) {
      api('/api/admin/settings')
        .then(loaded => setIdentity({ name: loaded.fromName, address: loaded.smtpUsername }))
        .catch(() => undefined)
    }
  }, [identity])

  const replyToSubmission = item => startCompose({
    title: `Odpowiedź: ${item.name}`,
    to: item.email,
    subject: `Re: ${item.subject || (item.app ? `${item.app} – ${REQUEST_TYPE_LABEL[item.requestType]}` : 'Twoje zapytanie')}`,
    html: quoteBlock({ author: item.name, date: item.createdAt, text: item.message }),
    submissionId: item.id,
  })

  const composeSent = () => {
    setCompose(null)
    setMailChange(value => value + 1)
    loadNotifications()
    if (tab === 'submissions') run(async () => setSubmissions(await api('/api/admin/submissions')))
  }

  const saveSettings = event => {
    event.preventDefault()
    run(async () => {
      const updated = await api('/api/admin/settings', json('PUT', settings))
      setSettings(current => ({ ...current, ...updated, password: '' }))
    }, 'Ustawienia poczty zostały bezpiecznie zapisane.')
  }

  const active = TABS.find(entry => entry[0] === tab)

  const unread = Object.values(notifications.counts).reduce((sum, value) => sum + value, 0)

  useEffect(() => {
    document.title = `${unread ? `(${unread}) ` : ''}${active?.[2] || 'Panel'}${item ? `: ${item}` : ''} – panel`
  }, [active, item, unread])

  return (
    <div className="ap-shell">
      <aside className="ap-sidebar">
        <a className="ap-brand" href="/admin" onClick={event => { event.preventDefault(); chooseTab('dashboard') }}>
          <img src="/assets/brand/favicon-r-180.png" alt="" />
          <span>Panel<i>redzikowski.com</i></span>
        </a>

        <nav aria-label="Sekcje panelu">
          {TABS.filter(([id]) => id !== 'settings').map(([id, , label, Icon, group], index, list) => (
            <Fragment key={id}>
              {group && group !== list[index - 1]?.[4] && <span className="ap-nav-group">{group}</span>}
              <a
                href={adminPath(id)}
                className={tab === id && !(id === 'apps' && item) ? 'is-active' : ''}
                aria-current={tab === id ? 'page' : undefined}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
                  event.preventDefault()
                  chooseTab(id)
                }}
              >
                <Icon size={16} /><span>{label}</span>
                {notifications.counts[id] > 0 && <b className="ap-count">{notifications.counts[id]}</b>}
              </a>
              {id === 'apps' && APP_LINKS.map(([slug, name, AppIcon]) => (
                <a
                  key={slug}
                  href={adminPath('apps', slug)}
                  className={`ap-nav-sub ${tab === 'apps' && item.split('/')[0] === slug ? 'is-active' : ''}`}
                  onClick={event => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
                    event.preventDefault()
                    chooseTab('apps', slug)
                  }}
                >
                  <AppIcon size={15} /><span>{name}</span>
                </a>
              ))}
            </Fragment>
          ))}
        </nav>

        <div className="ap-side-foot">
          <a
            href={adminPath('settings')}
            className={tab === 'settings' ? 'is-active' : ''}
            title="Ustawienia poczty"
            onClick={event => { if (event.metaKey || event.ctrlKey) return; event.preventDefault(); chooseTab('settings') }}
          >
            <Settings size={15} /><span>Ustawienia poczty</span>
          </a>
          <a href="/" title="Wróć na stronę"><ArrowLeft size={15} /><span>Wróć na stronę</span></a>
          <p className="ap-side-user" title={admin?.username ? `Zalogowano jako ${admin.username}` : undefined}>
            <b>{(admin?.username || 'A').slice(0, 1).toUpperCase()}</b><span>{admin?.username || 'Administrator'}</span>
          </p>
          <button type="button" onClick={onLogout} title="Wyloguj"><LogOut size={15} /><span>Wyloguj</span></button>
        </div>
      </aside>

      <main className={`ap-main ${tab === 'gallery' ? 'is-gallery' : ''}`}>
        {tab !== 'gallery' && <header className="ap-header">
          <div>
            <h1>{active?.[2]}</h1>
            {active?.[5] && <p>{active[5]}</p>}
          </div>
          <div className="ap-header-actions">
            {REFRESHABLE.has(tab) && (
              <button className="ap-btn ap-btn-sm" onClick={refresh} disabled={loading} title="Pobierz dane jeszcze raz">
                <RefreshCw className={loading ? 'spin' : ''} size={14} /> Odśwież
              </button>
            )}
            <a className="ap-btn ap-btn-sm" href={publicPathFor(tab, item)} target="_blank" rel="noreferrer">
              Zobacz na stronie <ArrowUpRight size={14} />
            </a>
            <NotificationBell data={notifications} onOpen={chooseTab} />
          </div>
        </header>}

        <div className={`ap-body ${tab === 'gallery' ? 'is-gallery' : ''}`}>
          {tab === 'dashboard' && <Dashboard submissions={submissions} pages={pages} projects={projects} unread={unread} onTab={chooseTab} />}

          {tab === 'submissions' && (
            <Submissions items={submissions} loading={loading} onStatus={changeStatus} onDelete={deleteSubmission} onReply={replyToSubmission} />
          )}

          {tab === 'testers' && <TestersPanel key={refreshKey} onChange={loadNotifications} />}
          {tab === 'apps' && <AppsPanel key={`a${refreshKey}`} item={item} onItem={selectItem} onChange={loadNotifications} />}
          {tab === 'bugReports' && <AppFeedbackPanel mode="reports" key={`r${refreshKey}`} onChange={loadNotifications} />}
          {tab === 'appFeedback' && <AppFeedbackPanel mode="feedback" key={`f${refreshKey}`} onChange={loadNotifications} />}

          {tab === 'analytics' && <AnalyticsPanel key={refreshKey} />}
          {tab === 'projects' && <ProjectsManager notify={notify} item={item} onItem={selectItem} />}

          {tab === 'resources' && <ResourcesManager />}
          {tab === 'links' && <LinksManager item={item} onItem={selectItem} />}
          {tab === 'downloads' && <DownloadsPanel key={refreshKey} />}
          {tab === 'pages' && <PagesManager notify={notify} item={item} onItem={selectItem} />}

          {tab === 'content' && <ContentManager notify={notify} item={item} onItem={selectItem} />}

          {tab === 'gallery' && <GalleryManager />}

          {tab === 'mail' && (
            <MailPanel
              refreshKey={refreshKey}
              changeKey={mailChange}
              onCompose={startCompose}
              onChange={loadNotifications}
              onSettings={() => chooseTab('settings')}
            />
          )}

          {tab === 'settings' && (
            <MailSettings settings={settings} setSettings={setSettings} onSave={saveSettings} loading={loading} />
          )}
        </div>

        {loading && (
          <div className="ap-loading"><LoaderCircle className="spin" size={15} /> Pracuję…</div>
        )}
        {compose && <MailComposer draft={compose} identity={identity} onClose={() => { setCompose(null); setMailChange(value => value + 1) }} onSent={composeSent} />}
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
