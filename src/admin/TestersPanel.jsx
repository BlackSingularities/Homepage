import { useCallback, useEffect, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { Empty, toast } from './parts'

const PLATFORM_LABEL = { android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' }
const STATUSES = [['new', 'Nowi'], ['added', 'Dodani'], ['all', 'Wszyscy']]

/** Filtr z licznikami: `all` plus jedna pozycja na każdą wartość z listy. */
function Filter({ items, field, value, onChange, label, allLabel }) {
  const values = [...new Set(items.map(item => item[field]))]
  return (
    <div className="ap-filters" role="group" aria-label={label}>
      <button className={value === 'all' ? 'is-active' : ''} onClick={() => onChange('all')}>{allLabel} <b>{items.length}</b></button>
      {values.map(entry => (
        <button key={entry} className={value === entry ? 'is-active' : ''} onClick={() => onChange(entry)}>
          {PLATFORM_LABEL[entry] || entry} <b>{items.filter(item => item[field] === entry).length}</b>
        </button>
      ))}
    </div>
  )
}

/**
 * Lista chętnych do testów. Sklepy przyjmują adresy hurtem, więc główna ścieżka
 * to: odfiltruj aplikację i platformę, skopiuj adresy, oznacz jako dodanych.
 */
export default function TestersPanel({ onChange }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('new')
  const [app, setApp] = useState('all')
  const [platform, setPlatform] = useState('all')

  const load = useCallback(async () => {
    try {
      setItems(await api('/api/admin/testers'))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const inStatus = status === 'all' ? items : items.filter(item => item.status === status)
  const inApp = app === 'all' ? inStatus : inStatus.filter(item => item.project === app)
  const visible = platform === 'all' ? inApp : inApp.filter(item => item.platform === platform)

  const mark = async (ids, next) => {
    try {
      setItems(await api('/api/admin/testers', json('PATCH', { ids, status: next })))
      onChange()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async item => {
    if (!window.confirm(`Usunąć zgłoszenie ${item.email}?`)) return
    try {
      await api(`/api/admin/testers/${item.id}`, { method: 'DELETE' })
      setItems(current => current.filter(entry => entry.id !== item.id))
      onChange()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText([...new Set(visible.map(item => item.email))].join(', '))
      toast.success('Adresy skopiowane do schowka.')
    } catch {
      toast.error('Nie udało się skopiować adresów.')
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
      <Filter items={inStatus} field="project" value={app} onChange={setApp} label="Aplikacja" allLabel="Każda aplikacja" />
      <Filter items={inApp} field="platform" value={platform} onChange={setPlatform} label="Platforma" allLabel="Każda platforma" />

      {visible.length > 0 && (
        <div className="ap-header-actions">
          <button className="ap-btn ap-btn-ghost" onClick={copy}><Copy size={14} /> Kopiuj adresy ({visible.length})</button>
          {visible.some(item => item.status === 'new') && (
            <button className="ap-btn ap-btn-ghost" onClick={() => mark(visible.map(item => item.id), 'added')}>Oznacz wszystkich jako dodanych</button>
          )}
        </div>
      )}

      {loaded && !visible.length && <Empty>Brak testerów w tym widoku.</Empty>}

      {visible.map(item => (
        <article className="ap-submission" key={item.id}>
          <header>
            <span className={`ap-status is-${item.status}`}>{item.status === 'added' ? 'Dodany' : 'Nowy'}</span>
            <span>{formatDate(item.createdAt)}</span>
            <span>{item.project} · {PLATFORM_LABEL[item.platform] || item.platform}</span>
            <button className="ap-icon-btn is-danger" onClick={() => remove(item)} aria-label="Usuń testera">
              <Trash2 size={14} />
            </button>
          </header>
          <div className="ap-submission-grid">
            <p className="ap-strong"><a href={`mailto:${item.email}`}>{item.email}</a></p>
          </div>
          <footer>
            <button className={item.status === 'new' ? 'is-active' : ''} onClick={() => mark([item.id], 'new')}>Nowy</button>
            <button className={item.status === 'added' ? 'is-active' : ''} onClick={() => mark([item.id], 'added')}>Dodany</button>
          </footer>
        </article>
      ))}
    </div>
  )
}
