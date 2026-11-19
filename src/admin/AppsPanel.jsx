import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight, Ban, Check, Crown, Database, ImageIcon, Mail, MapPin, MessageSquareText, RotateCcw, Save, Send, ShieldCheck, Trash2, UserRound, Users,
} from 'lucide-react'
import { api, formatDate, formatDay, json } from '../lib/api'
import { Card, Empty, Text, Toggle, Segmented, toast } from './parts'
import MapPointsPanel from './MapPointsPanel'

/**
 * „Zarządzanie aplikacjami”: aplikacje z kontami użytkowników (na razie GRAŃ). Każda ma własny
 * adres /admin/aplikacje/<slug>/<sekcja>: przegląd z liczbami, punkty na mapie (moderacja,
 * zdjęcia, scalanie), konta użytkowników i ustawienia (moderacja, limity zdjęć, poczta SMTP).
 */

const SECTIONS = [
  ['przeglad', 'Przegląd'],
  ['punkty', 'Punkty na mapie'],
  ['uzytkownicy', 'Użytkownicy'],
  ['ustawienia', 'Ustawienia'],
]
const PLATFORM_LABEL = { android: 'Android', windows: 'Windows', ios: 'iOS', linux: 'Linux', macos: 'macOS', other: 'Inna' }
const USER_STATUS = { active: 'Aktywne', pending: 'Czeka na aktywację', blocked: 'Zablokowane' }
const USER_FILTERS = [['all', 'Wszystkie'], ['active', 'Aktywne'], ['pending', 'Czekają'], ['blocked', 'Zablokowane'], ['premium', 'Premium']]
/** Filtr listy kont: stan konta albo konta premium (Studio w GRANI na Windows). */
const matches = (user, id) => id === 'all' || (id === 'premium' ? user.premium : user.status === id)

const mb = bytes => `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`

function Stat({ label, value, hint, onClick }) {
  return (
    <button type="button" className="ax-stat" onClick={onClick} disabled={!onClick}>
      <span>{label}</span>
      <b>{value}</b>
      {hint && <i>{hint}</i>}
    </button>
  )
}

/* ── lista aplikacji ──────────────────────────────────────────────── */

function AppList({ apps, onOpen }) {
  if (!apps.length) return <Empty>Brak aplikacji z kontami użytkowników.</Empty>
  return (
    <div className="ax-apps">
      {apps.map(app => (
        <button type="button" className="ax-app" key={app.id} onClick={() => onOpen(app.slug)}>
          <span className="ax-app-icon"><MapPin size={20} /></span>
          <span className="ax-app-main">
            <b>{app.name}</b>
            <span>{app.users.total} kont · {app.users.active} aktywnych · {app.content.points ?? 0} punktów · {app.content.photos ?? 0} zdjęć</span>
          </span>
          {(app.content.pointsPending + app.content.commentsPending + app.content.photosPending) > 0 && (
            <b className="ap-count">{app.content.pointsPending + app.content.commentsPending + app.content.photosPending}</b>
          )}
          <ArrowUpRight size={16} />
        </button>
      ))}
    </div>
  )
}

/* ── przegląd ─────────────────────────────────────────────────────── */

/** Dane okolicy GRANI trzymane na serwerze (Polska, Czechy, Słowacja): postęp zapełniania. */
function ServerData() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => api('/api/admin/gran-sectors').then(value => alive && setData(value)).catch(() => undefined)
    load()
    const timer = setInterval(load, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  if (!data) return null
  const pct = data.planned ? Math.min(100, Math.round((data.fresh / data.planned) * 100)) : 0
  return (
    <>
      <h3 className="ax-h"><Database size={15} /> Dane okolicy na serwerze ({data.regions.join(', ')})</h3>
      <div className="ax-stats">
        <Stat label="Gotowe zapytania" value={`${pct}%`} hint={`${data.fresh} z ${data.planned} · ${data.sectors} sektorów`} />
        <Stat label="Zajęte miejsce" value={mb(data.bytes)} hint={`zapisane odpowiedzi: ${data.stored}`} />
        <Stat label="W kolejce" value={data.queued} hint={data.busy ? 'pobieranie trwa' : 'bezczynna'} />
        <Stat label="Wydane aplikacji" value={data.served} hint={`od uruchomienia · pobrane: ${data.fetched}, błędy: ${data.failed}`} />
      </div>
      {data.lastError && <p className="ap-muted">Ostatni błąd Overpass: {data.lastError}</p>}
    </>
  )
}

function Overview({ summary, onSection }) {
  const { users, content, mail } = summary
  const todo = (content.pointsPending || 0) + (content.commentsPending || 0) + (content.photosPending || 0)
  const platforms = Object.entries(users.platforms || {}).sort((a, b) => b[1] - a[1])
  return (
    <div className="ap-stack">
      {!mail.ready && (
        <div className="ax-alert">Ani aplikacja, ani strona nie ma skonfigurowanej poczty – rejestracja nie wyśle linków aktywacyjnych. Ustaw konto SMTP w <button type="button" onClick={() => onSection('ustawienia')}>ustawieniach aplikacji</button> albo w ustawieniach poczty strony.</div>
      )}
      <h3 className="ax-h"><Users size={15} /> Użytkownicy</h3>
      <div className="ax-stats">
        <Stat label="Wszystkie konta" value={users.total} onClick={() => onSection('uzytkownicy')} />
        <Stat label="Aktywne" value={users.active} />
        <Stat label="Czekają na aktywację" value={users.pending} />
        <Stat label="Nowe (7 dni)" value={users.new7} hint={`30 dni: ${users.new30}`} />
        <Stat label="Korzystali (7 dni)" value={users.seen7} hint={`30 dni: ${users.seen30}`} />
        <Stat label="Zablokowane" value={users.blocked} />
      </div>
      {platforms.length > 0 && (
        <p className="ax-platforms">{platforms.map(([id, count]) => <span key={id}>{PLATFORM_LABEL[id] || id} <b>{count}</b></span>)}</p>
      )}
      <h3 className="ax-h"><MapPin size={15} /> Wpisy</h3>
      <div className="ax-stats">
        <Stat label="Do moderacji" value={todo} hint={`${content.pointsPending || 0} punktów · ${content.commentsPending || 0} komentarzy · ${content.photosPending || 0} zdjęć`} onClick={() => onSection('punkty')} />
        <Stat label="Punkty" value={content.points || 0} hint={`opublikowane: ${content.pointsApproved || 0}`} onClick={() => onSection('punkty')} />
        <Stat label="Komentarze" value={content.comments || 0} />
        <Stat label="Zdjęcia" value={content.photos || 0} hint={mb(content.photosBytes || 0)} />
        <Stat label="Zgłoszone punkty" value={content.reported || 0} onClick={() => onSection('punkty')} />
      </div>
      {summary.id === 'gran-3d' && <ServerData />}
      <h3 className="ax-h"><ShieldCheck size={15} /> Strony dla użytkowników</h3>
      <div className="ax-links">
        <a className="ap-btn ap-btn-ghost" href={`/aplikacje/${summary.slug}/prywatnosc`} target="_blank" rel="noreferrer">Polityka prywatności <ArrowUpRight size={14} /></a>
        <span className="ap-muted">Poczta: {mail.own ? 'własne konto SMTP aplikacji' : mail.ready ? 'skrzynka redzikowski.com' : 'nieskonfigurowana'}</span>
      </div>
    </div>
  )
}

/* ── użytkownicy ──────────────────────────────────────────────────── */

function UsersSection({ appId, onChange }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      setItems(await api(`/api/admin/apps/${appId}/users`))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoaded(true)
    }
  }, [appId])

  useEffect(() => { load() }, [load])

  const setStatus = async (user, status) => {
    try {
      const updated = await api(`/api/admin/apps/${appId}/users/${user.id}`, json('PATCH', { status }))
      setItems(current => current.map(item => (item.id === user.id ? { ...item, ...updated } : item)))
      toast.success(status === 'blocked' ? `Zablokowano ${user.name} (wylogowane ze wszystkich urządzeń).` : `Konto ${user.name} jest aktywne.`)
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // konto premium: dostęp do modułu Studio w GRANI na Windows (aplikacja nie mówi o kontach premium)
  const setPremium = async (user, premium) => {
    try {
      const updated = await api(`/api/admin/apps/${appId}/users/${user.id}`, json('PATCH', { premium }))
      setItems(current => current.map(item => (item.id === user.id ? { ...item, ...updated } : item)))
      toast.success(premium ? `${user.name} ma teraz konto premium (Studio w GRANI na Windows).` : `${user.name} nie ma już konta premium.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const resend = async user => {
    try {
      const updated = await api(`/api/admin/apps/${appId}/users/${user.id}/resend`, json('POST', {}))
      setItems(current => current.map(item => (item.id === user.id ? { ...item, ...updated } : item)))
      toast.success(`Wysłano nowy link aktywacyjny do ${user.email}.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async user => {
    if (!window.confirm(`Usunąć konto ${user.name} (${user.email})? Zdjęcia konta zostaną usunięte, a punkty i komentarze zostaną jako anonimowe. Tej operacji nie da się cofnąć.`)) return
    try {
      await api(`/api/admin/apps/${appId}/users/${user.id}`, { method: 'DELETE' })
      setItems(current => current.filter(item => item.id !== user.id))
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter(user => matches(user, filter))
      .filter(user => !q || `${user.name} ${user.email}`.toLowerCase().includes(q))
  }, [items, filter, query])

  return (
    <div className="ap-stack">
      <div className="ap-mappoint-head">
        <div className="ap-filters" role="group" aria-label="Stan konta">
          {USER_FILTERS.map(([id, label]) => (
            <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>
              {label} <b>{items.filter(user => matches(user, id)).length}</b>
            </button>
          ))}
        </div>
        <input className="ap-mappoint-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Szukaj po nazwie lub adresie" />
      </div>
      {loaded && !visible.length && <Empty>Brak kont w tym widoku.</Empty>}
      <div className="ax-users">
        {visible.map(user => (
          <article className="ax-user" key={user.id}>
            <div className="ax-user-main">
              <span className="ax-avatar"><UserRound size={16} /></span>
              <div>
                <b>{user.name}</b>
                <a href={`mailto:${user.email}`}>{user.email}</a>
              </div>
              {user.premium && <span className="ap-status is-premium" title={user.premiumSince ? `Premium od ${formatDay(user.premiumSince)}` : undefined}><Crown size={12} /> Premium</span>}
              <span className={`ap-status is-${user.status === 'active' ? 'closed' : user.status === 'pending' ? 'new' : 'in-progress'}`}>{USER_STATUS[user.status] || user.status}</span>
            </div>
            <dl className="ax-user-meta">
              <div><dt>Założone</dt><dd>{formatDay(user.createdAt)}</dd></div>
              <div><dt>Ostatnio</dt><dd>{user.lastSeenAt ? formatDate(user.lastSeenAt) : '–'}</dd></div>
              <div><dt>Urządzenie</dt><dd>{[PLATFORM_LABEL[user.platform] || user.platform, user.appVersion].filter(Boolean).join(' ') || '–'}</dd></div>
              <div><dt>Wpisy</dt><dd title="punkty · komentarze · zdjęcia"><MapPin size={12} /> {user.counts?.points || 0} <MessageSquareText size={12} /> {user.counts?.comments || 0} <ImageIcon size={12} /> {user.counts?.photos || 0}</dd></div>
            </dl>
            <div className="ax-user-actions">
              {user.status === 'pending' && <button className="ap-btn ap-btn-sm" onClick={() => resend(user)}><Send size={13} /> Wyślij link ponownie</button>}
              {user.status !== 'active' && <button className="ap-btn ap-btn-sm" onClick={() => setStatus(user, 'active')}><Check size={13} /> {user.status === 'blocked' ? 'Odblokuj' : 'Aktywuj ręcznie'}</button>}
              {user.status !== 'blocked' && <button className="ap-btn ap-btn-sm" onClick={() => setStatus(user, 'blocked')}><Ban size={13} /> Zablokuj</button>}
              <button className="ap-btn ap-btn-sm" onClick={() => setPremium(user, !user.premium)} title="Konto premium: moduł Studio w GRANI na Windows (wycinki 3D, przekroje, mapy wektorowe)"><Crown size={13} /> {user.premium ? 'Odbierz premium' : 'Nadaj premium'}</button>
              <a className="ap-btn ap-btn-sm" href={`mailto:${user.email}`}><Mail size={13} /> Napisz</a>
              <button className="ap-btn ap-btn-sm ap-btn-danger" onClick={() => remove(user)}><Trash2 size={13} /> Usuń konto</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ── ustawienia ───────────────────────────────────────────────────── */

function SettingsSection({ appId, onSaved }) {
  const [settings, setSettings] = useState(null)
  const [password, setPassword] = useState('')
  const [testTo, setTestTo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api(`/api/admin/apps/${appId}/settings`).then(setSettings).catch(error => toast.error(error.message))
  }, [appId])

  if (!settings) return null
  const set = patch => setSettings(current => ({ ...current, ...patch }))
  const setMail = patch => setSettings(current => ({ ...current, mail: { ...current.mail, ...patch } }))
  const own = Boolean(settings.mail.smtpHost && settings.mail.smtpUsername && (settings.mail.hasPassword || password))

  const save = async (extra = {}) => {
    setBusy(true)
    try {
      const updated = await api(`/api/admin/apps/${appId}/settings`, json('PUT', { ...settings, mail: { ...settings.mail, password, ...extra } }))
      setSettings(current => ({ ...current, ...updated }))
      setPassword('')
      toast.success('Ustawienia aplikacji zapisane.')
      onSaved?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true)
    try {
      const result = await api(`/api/admin/apps/${appId}/test-mail`, json('POST', { to: testTo }))
      toast.success(`Wysłano próbną wiadomość na ${result.to} (${result.own ? 'konto aplikacji' : 'skrzynka strony'}).`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ap-stack" onSubmit={event => { event.preventDefault(); save() }}>
      <Card title="Moderacja i wpisy" description="Dotyczy punktów, komentarzy i zdjęć dodawanych w aplikacji.">
        <Toggle checked={settings.autoApprove} onChange={value => set({ autoApprove: value })} label="Publikuj nowe wpisy bez moderacji" hint="Wyłączone – punkty, komentarze i zdjęcia czekają na zatwierdzenie w zakładce Punkty na mapie." />
        <div className="ap-grid-3">
          <Text label="Najwięcej zdjęć od jednej osoby" type="number" value={settings.photosPerUser} onChange={value => set({ photosPerUser: value })} hint="0 wyłącza dodawanie zdjęć." />
          <Segmented label="Limit zdjęć liczony" value={settings.photoScope} onChange={value => set({ photoScope: value })} options={[['point', 'na punkt'], ['app', 'na całą aplikację']]} />
          <Text label="Promień scalania (m)" type="number" value={settings.mergeRadius} onChange={value => set({ mergeRadius: value })} hint="Aplikacja proponuje dołączenie do punktu w tej odległości; panel podpowiada scalenie." />
        </div>
        <p className="ap-hint">Zdjęcia są zawsze zmniejszane do 2048 px i zapisywane jako JPEG 75% bez metadanych (aplikacja i serwer).</p>
      </Card>

      <Card title="Poczta aplikacji" description="Wiadomości aktywacyjne i do zmiany hasła. Bez własnego konta SMTP wychodzą ze skrzynki redzikowski.com.">
        <p className={`ax-mailstate ${own ? 'is-own' : ''}`}>
          {own
            ? `Nadawca: ${settings.mail.fromName || 'GRAŃ'} <${settings.mail.fromAddress || settings.mail.smtpUsername}>`
            : settings.siteMail?.ready
              ? `Używana skrzynka strony: ${settings.siteMail.address}`
              : 'Uwaga: strona też nie ma skonfigurowanej poczty – rejestracja nie zadziała.'}
        </p>
        <div className="ap-grid-2">
          <Text label="Adres obsługi aplikacji" value={settings.supportEmail} onChange={value => set({ supportEmail: value })} placeholder="np. gran@redzikowski.com" hint="Odpowiedzi na wiadomości i kontakt w polityce prywatności. Puste – adres nadawcy." />
          <Text label="Nazwa nadawcy" value={settings.mail.fromName} onChange={value => setMail({ fromName: value })} placeholder="GRAŃ" />
          <Text label="Serwer SMTP" value={settings.mail.smtpHost} onChange={value => setMail({ smtpHost: value })} placeholder="puste – skrzynka redzikowski.com" />
          <Text label="Port" type="number" value={settings.mail.smtpPort} onChange={value => setMail({ smtpPort: value })} />
          <Text label="Użytkownik SMTP" value={settings.mail.smtpUsername} onChange={value => setMail({ smtpUsername: value })} />
          <Text label="Hasło SMTP" type="password" value={password} onChange={setPassword} placeholder={settings.mail.hasPassword ? 'zapisane – wpisz, aby zmienić' : ''} />
          <Text label="Adres nadawcy" value={settings.mail.fromAddress} onChange={value => setMail({ fromAddress: value })} placeholder="puste – użytkownik SMTP" />
          <Toggle checked={settings.mail.smtpSecure} onChange={value => setMail({ smtpSecure: value })} label="Połączenie szyfrowane (SSL/TLS)" hint="Port 465 – włączone, 587 – wyłączone (STARTTLS)." />
        </div>
        <div className="ax-row">
          {settings.mail.hasPassword && (
            <button type="button" className="ap-btn ap-btn-sm" onClick={() => save({ clearPassword: true, smtpHost: '', smtpUsername: '' })}>
              <RotateCcw size={13} /> Wróć do skrzynki strony
            </button>
          )}
          <input className="ap-mappoint-search" type="email" value={testTo} onChange={event => setTestTo(event.target.value)} placeholder="Adres do próby (puste – Twój)" />
          <button type="button" className="ap-btn ap-btn-sm" onClick={test} disabled={busy}><Send size={13} /> Wyślij próbną wiadomość</button>
        </div>
      </Card>

      <div className="ax-row">
        <button type="submit" className="ap-btn ap-btn-primary" disabled={busy}><Save size={14} /> Zapisz ustawienia</button>
      </div>
    </form>
  )
}

/* ── całość ───────────────────────────────────────────────────────── */

export default function AppsPanel({ item = '', onItem, onChange }) {
  const [apps, setApps] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [slug, sectionRaw] = item.split('/')
  const section = SECTIONS.some(([id]) => id === sectionRaw) ? sectionRaw : 'przeglad'

  const load = useCallback(async () => {
    try {
      setApps(await api('/api/admin/apps'))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const app = apps.find(entry => entry.slug === slug)
  if (!slug) return loaded ? <AppList apps={apps} onOpen={next => onItem(next)} /> : null
  if (loaded && !app) return <Empty>Nie ma takiej aplikacji.</Empty>
  if (!app) return null

  const go = next => onItem(`${slug}/${next}`)
  const todo = (app.content.pointsPending || 0) + (app.content.commentsPending || 0) + (app.content.photosPending || 0)

  return (
    <div className="ap-stack">
      <div className="ax-head">
        <span className="ax-app-icon"><MapPin size={20} /></span>
        <div>
          <h2>{app.name}</h2>
          <p>{app.users.total} kont · {app.users.active} aktywnych · {app.content.points || 0} punktów</p>
        </div>
      </div>
      <div className="ap-filters" role="tablist" aria-label="Sekcje aplikacji">
        {SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} className={section === id ? 'is-active' : ''} onClick={() => go(id)}>
            {label}
            {id === 'punkty' && todo > 0 && <b>{todo}</b>}
            {id === 'uzytkownicy' && <b>{app.users.total}</b>}
          </button>
        ))}
      </div>
      {section === 'przeglad' && <Overview summary={app} onSection={go} />}
      {section === 'punkty' && <MapPointsPanel app={app.id} onChange={() => { onChange?.(); load() }} />}
      {section === 'uzytkownicy' && <UsersSection appId={app.id} onChange={load} />}
      {section === 'ustawienia' && <SettingsSection appId={app.id} onSaved={load} />}
    </div>
  )
}
