import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, EyeOff, Flag, MapPin, MessageSquareReply, Trash2 } from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { Empty, Toggle, toast } from './parts'

const CATEGORY_LABEL = {
  info: 'Informacja', warning: 'Utrudnienie', water: 'Woda', view: 'Punkt widokowy', shelter: 'Nocleg i schronienie',
  parking: 'Parking', photo: 'Miejsce na zdjęcie', other: 'Inne',
}
const STATUS_LABEL = { pending: 'Czeka', approved: 'Opublikowany', hidden: 'Ukryty' }
const PLATFORM_LABEL = { android: 'Android', windows: 'Windows', linux: 'Linux', other: 'Inna' }
const FILTERS = [['todo', 'Do decyzji'], ['pending', 'Czekające punkty'], ['reported', 'Zgłoszone'], ['approved', 'Opublikowane'], ['hidden', 'Ukryte'], ['all', 'Wszystkie']]

/** Punkt wymaga decyzji: czeka sam albo ma czekające komentarze lub zgłoszenia. */
const needsAction = point => point.status === 'pending' || (point.reports?.length > 0) || (point.comments || []).some(comment => comment.status === 'pending')

function matches(point, filter) {
  if (filter === 'all') return true
  if (filter === 'todo') return needsAction(point)
  if (filter === 'reported') return point.reports?.length > 0
  return point.status === filter
}

function MiniMap({ point }) {
  const d = 0.012
  const bbox = [point.lon - d * 1.6, point.lat - d, point.lon + d * 1.6, point.lat + d].map(value => value.toFixed(5)).join('%2C')
  return (
    <iframe
      className="ap-mappoint-map"
      title={`Mapa: ${point.title}`}
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=cyclemap&marker=${point.lat}%2C${point.lon}`}
    />
  )
}

function Reply({ point, onSaved }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      onSaved(await api(`/api/admin/map-points/${point.id}/reply`, json('POST', { text })))
      setText('')
      toast.success('Odpowiedź opublikowana – widać ją w aplikacji jako „GRAŃ”.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="ap-mappoint-reply">
      <textarea value={text} onChange={event => setText(event.target.value)} rows={2} placeholder="Odpowiedź od GRANI (widoczna od razu dla wszystkich)" />
      <button className="ap-btn" disabled={busy || text.trim().length < 2} onClick={send}><MessageSquareReply size={14} /> Odpowiedz</button>
    </div>
  )
}

/**
 * Punkty na mapie z komentarzami użytkowników GRANI (Windows i Android). Nowe wpisy czekają
 * na decyzję, chyba że włączone jest publikowanie bez moderacji.
 */
export default function MapPointsPanel({ onChange }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('todo')
  const [query, setQuery] = useState('')
  const [settings, setSettings] = useState({ autoApprove: false })

  const load = useCallback(async () => {
    try {
      const [points, loadedSettings] = await Promise.all([api('/api/admin/map-points'), api('/api/admin/map-points-settings')])
      setItems(points)
      setSettings(loadedSettings)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const replace = updated => {
    if (!updated) return
    setItems(current => current.map(item => (item.id === updated.id ? updated : item)))
    onChange?.()
  }

  const patch = async (point, body) => {
    try {
      replace(await api(`/api/admin/map-points/${point.id}`, json('PATCH', body)))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const patchComment = async (point, comment, body) => {
    try {
      replace(await api(`/api/admin/map-points/${point.id}/comments/${comment.id}`, json('PATCH', body)))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const removeComment = async (point, comment) => {
    if (!window.confirm('Usunąć ten komentarz na stałe?')) return
    try {
      replace(await api(`/api/admin/map-points/${point.id}/comments/${comment.id}`, { method: 'DELETE' }))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async point => {
    if (!window.confirm(`Usunąć punkt „${point.title}” razem z komentarzami? Tej operacji nie da się cofnąć.`)) return
    try {
      await api(`/api/admin/map-points/${point.id}`, { method: 'DELETE' })
      setItems(current => current.filter(item => item.id !== point.id))
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const saveSettings = async autoApprove => {
    try {
      setSettings(await api('/api/admin/map-points-settings', json('PUT', { autoApprove })))
      toast.success(autoApprove ? 'Nowe wpisy będą publikowane od razu.' : 'Nowe wpisy będą czekać na zatwierdzenie.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter(point => matches(point, filter))
      .filter(point => !q || [point.title, point.author, ...(point.comments || []).map(comment => comment.text)].join(' ').toLowerCase().includes(q))
  }, [items, filter, query])

  return (
    <div className="ap-stack">
      <div className="ap-mappoint-head">
        <Toggle checked={settings.autoApprove} onChange={saveSettings} label="Publikuj nowe punkty i komentarze bez moderacji" />
        <input className="ap-mappoint-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Szukaj w tytułach i komentarzach" />
      </div>
      <div className="ap-filters" role="group" aria-label="Widok">
        {FILTERS.map(([id, label]) => (
          <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>
            {label} <b>{items.filter(point => matches(point, id)).length}</b>
          </button>
        ))}
      </div>

      {loaded && !visible.length && <Empty>Brak punktów w tym widoku.</Empty>}

      {visible.map(point => (
        <article className="ap-submission ap-mappoint" key={point.id}>
          <header>
            <span className={`ap-status is-${point.status === 'approved' ? 'closed' : point.status === 'pending' ? 'new' : 'in-progress'}`}>{STATUS_LABEL[point.status] || point.status}</span>
            <span className="ap-tag">{CATEGORY_LABEL[point.category] || point.category}</span>
            <span>{formatDate(point.createdAt)}</span>
            <span>{PLATFORM_LABEL[point.platform] || point.platform}{point.appVersion ? ` ${point.appVersion}` : ''}</span>
            {point.reports?.length > 0 && <span className="ap-tag is-warn"><Flag size={12} /> {point.reports.length}</span>}
            <button className="ap-icon-btn is-danger" onClick={() => remove(point)} aria-label="Usuń punkt"><Trash2 size={14} /></button>
          </header>
          <div className="ap-submission-grid">
            <div>
              <h3><MapPin size={15} /> {point.title}</h3>
              <p>{point.author ? `Podpis: ${point.author}` : 'Bez podpisu'}</p>
              <p className="ap-mono">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}{point.ele != null ? ` · ${Math.round(point.ele)} m` : ''}</p>
              <p><a href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=15/${point.lat}/${point.lon}`} target="_blank" rel="noreferrer">Otwórz w OpenStreetMap</a></p>
              <MiniMap point={point} />
            </div>
            <div>
              <div className="ap-mappoint-comments">
                {(point.comments || []).map(comment => (
                  <div key={comment.id} className={`ap-mappoint-comment is-${comment.status}${comment.official ? ' is-official' : ''}`}>
                    <div className="ap-mappoint-comment-bar">
                      <strong>{comment.official ? 'GRAŃ' : comment.author || 'anonim'}</strong>
                      <time>{formatDate(comment.createdAt)}</time>
                      <span className="ap-tag">{STATUS_LABEL[comment.status] || comment.status}</span>
                      <span className="ap-mappoint-comment-actions">
                        {comment.status !== 'approved' && <button className="ap-icon-btn" onClick={() => patchComment(point, comment, { status: 'approved' })} aria-label="Zatwierdź komentarz" title="Zatwierdź"><Check size={14} /></button>}
                        {comment.status !== 'hidden' && <button className="ap-icon-btn" onClick={() => patchComment(point, comment, { status: 'hidden' })} aria-label="Ukryj komentarz" title="Ukryj"><EyeOff size={14} /></button>}
                        <button className="ap-icon-btn is-danger" onClick={() => removeComment(point, comment)} aria-label="Usuń komentarz" title="Usuń"><Trash2 size={14} /></button>
                      </span>
                    </div>
                    <p>{comment.text}</p>
                  </div>
                ))}
              </div>
              {point.reports?.length > 0 && (
                <div className="ap-feedback-comments">
                  {point.reports.map((report, index) => (
                    <p key={index}><time>{formatDate(report.at)}</time> · zgłoszenie{report.reason && report.reason !== 'app' ? `: ${report.reason}` : ''}</p>
                  ))}
                  <button className="ap-btn ap-btn-ghost" onClick={() => patch(point, { clearReports: true })}>Wyczyść zgłoszenia</button>
                </div>
              )}
              <Reply point={point} onSaved={replace} />
            </div>
          </div>
          <footer>
            <button className={point.status === 'approved' ? 'is-active' : ''} onClick={() => patch(point, { status: 'approved' })}>Opublikuj</button>
            <button className={point.status === 'pending' ? 'is-active' : ''} onClick={() => patch(point, { status: 'pending' })}>Do sprawdzenia</button>
            <button className={point.status === 'hidden' ? 'is-active' : ''} onClick={() => patch(point, { status: 'hidden' })}>Ukryj</button>
          </footer>
        </article>
      ))}
    </div>
  )
}
