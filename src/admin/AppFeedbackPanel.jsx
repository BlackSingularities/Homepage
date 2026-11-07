import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Copy, Mail, Trash2 } from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { Empty, toast } from './parts'

const PLATFORM_LABEL = {
  android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux', wearos: 'Wear OS', web: 'Web', other: 'Inna',
}
const KIND_LABEL = { crash: 'Awaria', bug: 'Błąd', feature: 'Sugestia' }
const STATUS_LABEL = { new: 'Nowe', 'in-progress': 'W toku', closed: 'Zamknięte' }
const STATUSES = [['new', 'Nowe'], ['in-progress', 'W toku'], ['closed', 'Zamknięte'], ['all', 'Wszystkie']]

function Filter({ items, field, value, onChange, label, allLabel, labels = {} }) {
  const values = [...new Set(items.map(item => item[field]).filter(Boolean))].sort((a, b) => String(labels[a] || a).localeCompare(String(labels[b] || b), 'pl'))
  if (values.length < 2 && value === 'all') return null
  return (
    <div className="ap-filters" role="group" aria-label={label}>
      <button className={value === 'all' ? 'is-active' : ''} onClick={() => onChange('all')}>{allLabel} <b>{items.length}</b></button>
      {values.map(entry => (
        <button key={entry} className={value === entry ? 'is-active' : ''} onClick={() => onChange(entry)}>
          {labels[entry] || entry} <b>{items.filter(item => item[field] === entry).length}</b>
        </button>
      ))}
    </div>
  )
}

function Diagnostics({ item }) {
  const [open, setOpen] = useState(item.kind === 'crash')
  const extra = Object.entries(item.extra || {})
  const hasAny = item.stack || item.log || extra.length
  if (!hasAny) return null
  const copy = async () => {
    const text = [
      `${item.appName} ${item.appVersion} · ${item.platform} ${item.os} · ${item.device}`,
      item.message,
      item.stack,
      item.log,
      ...extra.map(([key, value]) => `${key}: ${value}`),
    ].filter(Boolean).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Raport skopiowany do schowka.')
    } catch {
      toast.error('Nie udało się skopiować raportu.')
    }
  }
  return (
    <div className="ap-feedback-diag">
      <div className="ap-feedback-diag-bar">
        <button className="ap-btn ap-btn-ghost" onClick={() => setOpen(value => !value)} aria-expanded={open}>
          <ChevronDown size={14} className={open ? 'is-open' : ''} /> Dane diagnostyczne
        </button>
        <button className="ap-btn ap-btn-ghost" onClick={copy}><Copy size={14} /> Kopiuj</button>
      </div>
      {open && (
        <>
          {item.stack && <pre className="ap-feedback-pre">{item.stack}</pre>}
          {item.log && <pre className="ap-feedback-pre is-log">{item.log}</pre>}
          {extra.length > 0 && (
            <dl className="ap-feedback-extra">
              {extra.map(([key, value]) => (<div key={key}><dt>{key}</dt><dd>{value}</dd></div>))}
            </dl>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Zgłoszenia przysłane przez aplikacje. `mode="reports"` – raporty o błędach
 * (awarie z diagnostyką, zgrupowane po odcisku stosu); `mode="feedback"` –
 * zgłoszenia pisane przez użytkowników: błędy i sugestie funkcjonalności.
 */
export default function AppFeedbackPanel({ mode, onChange }) {
  const endpoint = mode === 'reports' ? '/api/admin/bug-reports' : '/api/admin/app-feedback'
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('new')
  const [app, setApp] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [kind, setKind] = useState('all')

  const load = useCallback(async () => {
    try {
      setItems(await api(endpoint))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoaded(true)
    }
  }, [endpoint])

  useEffect(() => { load() }, [load])

  const appLabels = useMemo(() => Object.fromEntries(items.map(item => [item.app, item.appName])), [items])
  const inStatus = status === 'all' ? items : items.filter(item => item.status === status)
  const inKind = kind === 'all' ? inStatus : inStatus.filter(item => item.kind === kind)
  const inApp = app === 'all' ? inKind : inKind.filter(item => item.app === app)
  const visible = platform === 'all' ? inApp : inApp.filter(item => item.platform === platform)

  const patch = async (item, body) => {
    try {
      const updated = await api(`${endpoint}/${item.id}`, json('PATCH', body))
      setItems(current => current.map(entry => (entry.id === item.id ? updated : entry)))
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async item => {
    if (!window.confirm('Usunąć to zgłoszenie? Tej operacji nie da się cofnąć.')) return
    try {
      await api(`${endpoint}/${item.id}`, { method: 'DELETE' })
      setItems(current => current.filter(entry => entry.id !== item.id))
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="ap-stack">
      <div className="ap-filters" role="group" aria-label="Status">
        {STATUSES.map(([id, label]) => (
          <button key={id} className={status === id ? 'is-active' : ''} onClick={() => setStatus(id)}>
            {label} <b>{id === 'all' ? items.length : items.filter(item => item.status === id).length}</b>
          </button>
        ))}
      </div>
      {mode === 'feedback' && (
        <Filter items={inStatus} field="kind" value={kind} onChange={setKind} label="Rodzaj" allLabel="Każdy rodzaj" labels={KIND_LABEL} />
      )}
      <Filter items={inKind} field="app" value={app} onChange={setApp} label="Aplikacja" allLabel="Każda aplikacja" labels={appLabels} />
      <Filter items={inApp} field="platform" value={platform} onChange={setPlatform} label="Platforma" allLabel="Każda platforma" labels={PLATFORM_LABEL} />

      {loaded && !visible.length && (
        <Empty>{mode === 'reports' ? 'Brak raportów o błędach w tym widoku.' : 'Brak zgłoszeń w tym widoku.'}</Empty>
      )}

      {visible.map(item => (
        <article className="ap-submission" key={item.id}>
          <header>
            <span className={`ap-status is-${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span>
            <span className="ap-tag">{KIND_LABEL[item.kind] || item.kind}</span>
            <span>{formatDate(item.lastAt || item.createdAt)}</span>
            <span>{item.appName}{item.appVersion ? ` ${item.appVersion}` : ''} · {PLATFORM_LABEL[item.platform] || item.platform}</span>
            {item.count > 1 && <span className="ap-tag">×{item.count}</span>}
            <button className="ap-icon-btn is-danger" onClick={() => remove(item)} aria-label="Usuń zgłoszenie">
              <Trash2 size={14} />
            </button>
          </header>
          <div className="ap-submission-grid">
            <div>
              {item.title && <h3>{item.title}</h3>}
              {item.email
                ? <p className="ap-strong"><a href={`mailto:${item.email}`}><Mail size={12} /> {item.email}</a></p>
                : <p>Bez adresu e-mail</p>}
              {item.os && <p>{item.os}</p>}
              {item.device && <p>{item.device}</p>}
              {item.locale && <p>Język: {item.locale}</p>}
              {item.versions?.length > 1 && <p>Wersje: {item.versions.join(', ')}</p>}
              {item.count > 1 && <p>Pierwszy raz: {formatDate(item.createdAt)}</p>}
            </div>
            <div>
              {item.message
                ? <p className="ap-feedback-message">{item.message}</p>
                : <p className="ap-feedback-muted">Użytkownik nie dodał opisu.</p>}
              {item.comments?.length > 0 && (
                <div className="ap-feedback-comments">
                  {item.comments.map((comment, index) => (
                    <p key={index}>
                      <time>{formatDate(comment.at)}</time>
                      {comment.appVersion && ` · ${comment.appVersion}`}
                      {comment.email && <> · <a href={`mailto:${comment.email}`}>{comment.email}</a></>}
                      {comment.message && <><br />{comment.message}</>}
                    </p>
                  ))}
                </div>
              )}
              <Diagnostics item={item} />
            </div>
          </div>
          <footer>
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <button key={id} className={item.status === id ? 'is-active' : ''} onClick={() => patch(item, { status: id })}>{label}</button>
            ))}
          </footer>
        </article>
      ))}
    </div>
  )
}
