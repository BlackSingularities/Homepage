import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Combine, EyeOff, Flag, Image as ImageIcon, MapPin, MessageSquareReply, Trash2, UserRound } from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { Empty, Toggle, toast } from './parts'

const CATEGORY_LABEL = {
  info: 'Informacja', warning: 'Utrudnienie', closed: 'Szlak zamknięty', avalanche: 'Zagrożenie lawinowe',
  exposed: 'Łańcuchy i ekspozycja', water: 'Woda', entrance: 'Wejście i opłaty', transport: 'Dojazd i parking',
  signal: 'Zasięg i ratunek', shelter: 'Schron', view: 'Punkt widokowy', photo: 'Miejsce na zdjęcie', ban: 'Zakaz',
  parking: 'Parking', other: 'Inne',
}
const STATUS_LABEL = { pending: 'Czeka', approved: 'Opublikowany', hidden: 'Ukryty' }
const PLATFORM_LABEL = { android: 'Android', windows: 'Windows', ios: 'iOS', linux: 'Linux', other: 'Inna' }
const FILTERS = [['todo', 'Do decyzji'], ['pending', 'Czekające punkty'], ['reported', 'Zgłoszone'], ['nearby', 'Blisko innych'], ['photos', 'Ze zdjęciami'], ['approved', 'Opublikowane'], ['hidden', 'Ukryte'], ['all', 'Wszystkie']]

/** Punkt wymaga decyzji: czeka sam albo ma czekające komentarze, zdjęcia lub zgłoszenia. */
const needsAction = point => point.status === 'pending' || (point.reports?.length > 0)
  || (point.comments || []).some(comment => comment.status === 'pending')
  || (point.photos || []).some(photo => photo.status === 'pending')

function matches(point, filter, near) {
  if (filter === 'all') return true
  if (filter === 'todo') return needsAction(point)
  if (filter === 'reported') return point.reports?.length > 0
  if (filter === 'nearby') return (near.get(point.id) || []).length > 0
  if (filter === 'photos') return (point.photos || []).length > 0
  return point.status === filter
}

/** Odległość w metrach (haversine). */
function distance(a, b) {
  const rad = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Dla każdego punktu: inne (nieukryte) punkty w promieniu scalania, od najbliższego. */
function nearbyMap(items, radius) {
  const map = new Map()
  const live = items.filter(point => point.status !== 'hidden')
  for (const point of live) {
    const list = live
      .filter(other => other.id !== point.id)
      .map(other => ({ point: other, distance: Math.round(distance(point, other)) }))
      .filter(entry => entry.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
    if (list.length) map.set(point.id, list)
  }
  return map
}

const PHOTO_STATUS = { pending: 'Czeka', approved: 'Widoczne', hidden: 'Ukryte' }

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
 * Punkty na mapie z komentarzami i zdjęciami użytkowników aplikacji (GRAŃ na Windows, Androida
 * i iOS). Nowe wpisy czekają na decyzję, chyba że włączone jest publikowanie bez moderacji.
 * Punkty leżące blisko siebie można scalić w jeden.
 */
export default function MapPointsPanel({ app = 'gran-3d', onChange }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('todo')
  const [query, setQuery] = useState('')
  const [settings, setSettings] = useState(null)

  const load = useCallback(async () => {
    try {
      const [points, loadedSettings] = await Promise.all([api(`/api/admin/map-points?app=${app}`), api(`/api/admin/apps/${app}/settings`)])
      setItems(points)
      setSettings(loadedSettings)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoaded(true)
    }
  }, [app])

  useEffect(() => { load() }, [load])

  const replace = updated => {
    if (!updated) return
    setItems(current => current.map(item => (item.id === updated.id ? updated : item)))
    onChange?.()
  }

  const call = async (url, options) => {
    try {
      replace(await api(url, options))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const patch = (point, body) => call(`/api/admin/map-points/${point.id}`, json('PATCH', body))
  const patchComment = (point, comment, body) => call(`/api/admin/map-points/${point.id}/comments/${comment.id}`, json('PATCH', body))
  const patchPhoto = (point, photo, status) => call(`/api/admin/map-points/${point.id}/photos/${photo.id}`, json('PATCH', { status }))

  const removePhoto = (point, photo) => {
    if (window.confirm('Usunąć to zdjęcie na stałe (razem z plikiem)?')) call(`/api/admin/map-points/${point.id}/photos/${photo.id}`, { method: 'DELETE' })
  }

  const removeComment = (point, comment) => {
    if (window.confirm('Usunąć ten komentarz na stałe?')) call(`/api/admin/map-points/${point.id}/comments/${comment.id}`, { method: 'DELETE' })
  }

  const remove = async point => {
    if (!window.confirm(`Usunąć punkt „${point.title}” razem z komentarzami i zdjęciami? Tej operacji nie da się cofnąć.`)) return
    try {
      await api(`/api/admin/map-points/${point.id}`, { method: 'DELETE' })
      setItems(current => current.filter(item => item.id !== point.id))
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const merge = async (source, target) => {
    if (!window.confirm(`Scalić „${source.title}” z „${target.title}”? Komentarze, zdjęcia i oceny przejdą do „${target.title}”, a „${source.title}” zniknie.`)) return
    try {
      const updated = await api(`/api/admin/map-points/${source.id}/merge`, json('POST', { into: target.id }))
      setItems(current => current.filter(item => item.id !== source.id).map(item => (item.id === updated.id ? updated : item)))
      toast.success(`Scalono z „${target.title}”.`)
      onChange?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const saveAutoApprove = async autoApprove => {
    try {
      setSettings(await api(`/api/admin/apps/${app}/settings`, json('PUT', { ...settings, autoApprove })))
      toast.success(autoApprove ? 'Nowe wpisy będą publikowane od razu.' : 'Nowe wpisy będą czekać na zatwierdzenie.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const near = useMemo(() => nearbyMap(items, settings?.mergeRadius || 150), [items, settings?.mergeRadius])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter(point => matches(point, filter, near))
      .filter(point => !q || [point.title, point.author, ...(point.comments || []).map(comment => `${comment.author} ${comment.text}`)].join(' ').toLowerCase().includes(q))
  }, [items, filter, query, near])

  return (
    <div className="ap-stack">
      <div className="ap-mappoint-head">
        {settings && <Toggle checked={settings.autoApprove} onChange={saveAutoApprove} label="Publikuj nowe punkty, komentarze i zdjęcia bez moderacji" />}
        <input className="ap-mappoint-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Szukaj w tytułach i komentarzach" />
      </div>
      <div className="ap-filters" role="group" aria-label="Widok">
        {FILTERS.map(([id, label]) => (
          <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>
            {label} <b>{items.filter(point => matches(point, id, near)).length}</b>
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
            {(point.photos || []).length > 0 && <span className="ap-tag" title="Zdjęcia"><ImageIcon size={12} /> {point.photos.length}</span>}
            {point.mergedFrom?.length > 0 && <span className="ap-tag" title="Scalony z innymi punktami"><Combine size={12} /> {point.mergedFrom.length}</span>}
            {Object.keys(point.votes || {}).length > 0 && (
              <span className="ap-tag" title="Oceny użytkowników">
                +{Object.values(point.votes).filter(value => value > 0).length} / −{Object.values(point.votes).filter(value => value < 0).length}
              </span>
            )}
            <button className="ap-icon-btn is-danger" onClick={() => remove(point)} aria-label="Usuń punkt"><Trash2 size={14} /></button>
          </header>
          <div className="ap-submission-grid">
            <div>
              <h3><MapPin size={15} /> {point.title}</h3>
              <p className="ap-mappoint-who"><UserRound size={13} /> {point.author || 'anonim'}{point.userId ? '' : ' · bez konta'}</p>
              <p className="ap-mono">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}{point.ele != null ? ` · ${Math.round(point.ele)} m` : ''}</p>
              <p><a href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=15/${point.lat}/${point.lon}`} target="_blank" rel="noreferrer">Otwórz w OpenStreetMap</a></p>
              <MiniMap point={point} />
              {(near.get(point.id) || []).length > 0 && (
                <div className="ap-mappoint-near">
                  <strong><Combine size={13} /> Blisko innych punktów</strong>
                  {near.get(point.id).slice(0, 4).map(({ point: other, distance: meters }) => (
                    <div key={other.id}>
                      <span>{other.title} · {meters} m{other.status !== 'approved' ? ` · ${STATUS_LABEL[other.status] || other.status}` : ''}</span>
                      <button className="ap-btn ap-btn-sm" onClick={() => merge(point, other)} title={`Przenieś wpisy do „${other.title}” i usuń ten punkt`}>Scal z tym</button>
                    </div>
                  ))}
                </div>
              )}
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
              {(point.photos || []).length > 0 && (
                <div className="ap-mappoint-photos">
                  {point.photos.map(photo => (
                    <figure key={photo.id} className={`is-${photo.status}`}>
                      <a href={`/api/admin/map-points/photos/${photo.file}`} target="_blank" rel="noreferrer">
                        <img src={`/api/admin/map-points/photos/${photo.file}?w=480`} alt={`Zdjęcie: ${point.title}`} loading="lazy" />
                      </a>
                      <figcaption>
                        <span>{photo.author || 'anonim'} · {PHOTO_STATUS[photo.status] || photo.status}</span>
                        <span className="ap-mappoint-comment-actions">
                          {photo.status !== 'approved' && <button className="ap-icon-btn" onClick={() => patchPhoto(point, photo, 'approved')} aria-label="Zatwierdź zdjęcie" title="Zatwierdź"><Check size={14} /></button>}
                          {photo.status !== 'hidden' && <button className="ap-icon-btn" onClick={() => patchPhoto(point, photo, 'hidden')} aria-label="Ukryj zdjęcie" title="Ukryj"><EyeOff size={14} /></button>}
                          <button className="ap-icon-btn is-danger" onClick={() => removePhoto(point, photo)} aria-label="Usuń zdjęcie" title="Usuń"><Trash2 size={14} /></button>
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
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
