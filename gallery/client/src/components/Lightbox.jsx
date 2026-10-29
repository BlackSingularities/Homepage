import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { photoSrc, thumbUrl, fileUrl, createAlbumShare } from '../api'
import { useToast } from './Feedback'
import {
  IconClose, IconPrev, IconNext, IconZoomIn, IconZoomOut,
  IconInfo, IconShare, IconPlay, IconPause, IconFullscreen, IconExitFullscreen,
  IconCamera, IconAperture, IconClock, IconCalendar, IconLayers, IconKeyboard,
} from './icons'

/**
 * Powiększenie zdjęcia. Galeria jest do oglądania, więc nie ma tu pobierania –
 * przeglądarka dostaje wariant poglądowy z wypalonym podpisem, a plik źródłowy
 * zostaje na serwerze.
 *
 * Sterowanie: strzałki i przeciągnięcie palcem zmieniają zdjęcie, kółko myszy
 * i podwójne kliknięcie powiększają, przeciąganie przesuwa powiększony kadr.
 * Paski chowają się po chwili bezruchu i wracają przy pierwszym ruchu.
 */

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return null }
}

const SLIDESHOW_MS = 4600
const IDLE_MS = 2600
const MAX_ZOOM = 4

const SHORTCUTS = [
  ['← →', 'Poprzednie i następne zdjęcie'],
  ['Spacja', 'Pokaz slajdów'],
  ['Z / dwuklik', 'Powiększenie'],
  ['I', 'Szczegóły zdjęcia'],
  ['F', 'Pełny ekran'],
  ['Home / End', 'Pierwsze i ostatnie zdjęcie'],
  ['?', 'Ta lista'],
  ['Esc', 'Zamknij'],
]

export default function Lightbox({
  photos, index: initIndex, onClose, onIndexChange, mediaToken = null,
  canShare = false, albumSlug = null, adminMode = false,
}) {
  const [idx, setIdx] = useState(initIndex ?? 0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [fade, setFade] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [idle, setIdle] = useState(false)
  const [shareExpiresIn, setShareExpiresIn] = useState('7d')
  const thumbRef = useRef(null)
  const backdropRef = useRef(null)
  const idleTimer = useRef(0)
  const dragStart = useRef(null)
  const toast = useToast()
  const total = photos.length
  const photo = photos[idx]

  const megapixels = useMemo(() => {
    if (!photo?.width || !photo?.height) return null
    return (photo.width * photo.height / 1_000_000).toFixed(1)
  }, [photo])

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const go = useCallback((next) => {
    setFade(false); setLoaded(false)
    setTimeout(() => {
      setIdx(next); setZoom(1); setPan({ x: 0, y: 0 }); setFade(true)
      onIndexChange?.(next)
    }, 140)
  }, [onIndexChange])
  const prev = useCallback(() => go((idx - 1 + total) % total), [go, idx, total])
  const next = useCallback(() => go((idx + 1) % total), [go, idx, total])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) backdropRef.current?.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.()
  }, [])

  // Sąsiednie zdjęcia ładują się w tle, więc przejście jest natychmiastowe.
  useEffect(() => {
    const preload = (i) => {
      const p = photos[i]
      if (!p) return
      const img = new Image()
      img.src = photoSrc(p, mediaToken)
    }
    preload((idx + 1) % total)
    preload((idx - 1 + total) % total)
  }, [idx, total, photos, mediaToken])

  useEffect(() => {
    const handler = (e) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'i', 'I', 'f', 'F', 'z', 'Z', 'Home', 'End'].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft') { setPlaying(false); prev() }
      if (e.key === 'ArrowRight') { setPlaying(false); next() }
      if (e.key === 'Escape') { if (showKeys) setShowKeys(false); else onClose() }
      if (e.key === 'z' || e.key === 'Z') { setPan({ x: 0, y: 0 }); setZoom(v => (v > 1 ? 1 : 2)) }
      if (e.key === 'i' || e.key === 'I') setShowInfo(v => !v)
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === '?') setShowKeys(v => !v)
      if (e.key === ' ' && total > 1) setPlaying(v => !v)
      if (e.key === 'Home') { setPlaying(false); go(0) }
      if (e.key === 'End') { setPlaying(false); go(total - 1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, onClose, go, total, showKeys, toggleFullscreen])

  useEffect(() => {
    backdropRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Paski chowają się dopiero wtedy, gdy nic się nie dzieje.
  useEffect(() => {
    const wake = () => {
      setIdle(false)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.clearTimeout(idleTimer.current)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(next, SLIDESHOW_MS)
    return () => clearInterval(t)
  }, [playing, idx, next])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const el = thumbRef.current?.querySelector('.lb-thumb.active')
    el?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [idx])

  // Przeciąganie: przy powiększeniu przesuwa kadr, bez powiększenia zmienia zdjęcie.
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    dragStart.current = { x: e.clientX, y: e.clientY, pan: { ...pan }, zoomed: zoom > 1, moved: false }
    if (zoom > 1) setPanning(true)
  }
  const onPointerMove = (e) => {
    const start = dragStart.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) start.moved = true
    if (start.zoomed) setPan({ x: start.pan.x + dx, y: start.pan.y + dy })
  }
  const onPointerUp = (e) => {
    const start = dragStart.current
    dragStart.current = null
    setPanning(false)
    if (!start) return
    const dx = e.clientX - start.x
    if (!start.zoomed && Math.abs(dx) > 60) {
      setPlaying(false)
      dx < 0 ? next() : prev()
      return
    }
    if (!start.moved && !start.zoomed) { setPlaying(false); next() }
  }

  const onWheel = (e) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return
    e.preventDefault()
    setZoom(v => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(1, v * (e.deltaY < 0 ? 1.18 : 1 / 1.18)))
      if (nextZoom === 1) setPan({ x: 0, y: 0 })
      return nextZoom
    })
  }

  const onDoubleClick = () => {
    setPan({ x: 0, y: 0 })
    setZoom(v => (v > 1 ? 1 : 2.2))
  }

  const photoTitle = photo.display_name || photo.original_name || 'Zdjęcie'

  const handleShare = async () => {
    try {
      const share = albumSlug ? await createAlbumShare(albumSlug, shareExpiresIn, mediaToken) : { token: mediaToken }
      const url = new URL(window.location.href)
      url.searchParams.set('photo', photo.id)
      if (share.token) url.searchParams.set('t', share.token)
      else url.searchParams.delete('t')
      const shareUrl = url.toString()
      if (navigator.share) {
        try { await navigator.share({ title: photoTitle, url: shareUrl }) } catch {}
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      toast.success(share.token ? 'Link do zdjęcia skopiowany' : 'Publiczny link do zdjęcia skopiowany')
    } catch {
      toast.error('Nie udało się przygotować linku')
    }
  }

  const hasExif = photo.camera_make || photo.camera_model || photo.lens || photo.aperture || photo.shutter_speed || photo.iso || photo.focal_length
  const takenDate = fmtDate(photo.taken_at)
  const uploadDate = fmtDate(photo.created_at)
  const block = (e) => e.preventDefault()

  return (
    <div
      className={`lb-backdrop ${idle && !showKeys ? 'is-idle' : ''}`}
      ref={backdropRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={photoTitle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onContextMenu={block}
      onDragStart={block}
      onCopy={block}
    >
      {playing && (
        <div className="lb-progress" aria-hidden="true" style={{ '--slideshow-ms': `${SLIDESHOW_MS}ms` }}>
          <i key={idx} />
        </div>
      )}

      <div className="lb-bar">
        <div className="lb-bar-left">
          <span className="lb-counter">{String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
          <span className="lb-filename">{photoTitle}</span>
          {photo.width && (
            <span className="lb-filename lb-filename-meta">
              {photo.width} × {photo.height}{megapixels && ` · ${megapixels} MP`}
            </span>
          )}
        </div>
        <div className="lb-bar-right">
          {total > 1 && (
            <button className={`lb-btn ${playing ? 'active' : ''}`} onClick={() => setPlaying(v => !v)} title={playing ? 'Zatrzymaj pokaz (Spacja)' : 'Pokaz slajdów (Spacja)'}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
          )}
          <button className={`lb-btn ${showInfo ? 'active' : ''}`} onClick={() => setShowInfo(v => !v)} title="Szczegóły (I)">
            <IconInfo />
          </button>
          {canShare && (
            <>
              {albumSlug && (
                <select
                  className="gal-select"
                  value={shareExpiresIn}
                  onChange={e => setShareExpiresIn(e.target.value)}
                  title="Jak długo link ma działać"
                >
                  <option value="1h">1 h</option>
                  <option value="24h">24 h</option>
                  <option value="7d">7 dni</option>
                  <option value="30d">30 dni</option>
                </select>
              )}
              <button className="lb-btn" onClick={handleShare} title="Skopiuj link do zdjęcia">
                <IconShare />
              </button>
            </>
          )}
          <button
            className={`lb-btn ${zoom > 1 ? 'active' : ''}`}
            onClick={() => { setPan({ x: 0, y: 0 }); setZoom(v => (v > 1 ? 1 : 2.2)) }}
            title="Powiększenie (Z)"
          >
            {zoom > 1 ? <IconZoomOut /> : <IconZoomIn />}
          </button>
          <button className={`lb-btn ${showKeys ? 'active' : ''}`} onClick={() => setShowKeys(v => !v)} title="Skróty klawiszowe (?)">
            <IconKeyboard />
          </button>
          <button className="lb-btn" onClick={toggleFullscreen} title="Pełny ekran (F)">
            {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
          </button>
          <button className="lb-btn" onClick={onClose} title="Zamknij (Esc)">
            <IconClose />
          </button>
        </div>
      </div>

      <div className="lb-body">
        <div
          className={`lb-stage ${zoom > 1 ? 'zoom-mode' : ''} ${panning ? 'is-panning' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { dragStart.current = null; setPanning(false) }}
          onDoubleClick={onDoubleClick}
          onWheel={onWheel}
        >
          {total > 1 && (
            <>
              <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); setPlaying(false); prev() }} aria-label="Poprzednie zdjęcie">
                <IconPrev />
              </button>
              <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); setPlaying(false); next() }} aria-label="Następne zdjęcie">
                <IconNext />
              </button>
            </>
          )}

          {photo.blur_data_url && (
            <img src={photo.blur_data_url} alt="" aria-hidden className="lb-img-blur" style={{ opacity: loaded ? 0 : 1 }} draggable={false} />
          )}
          {!loaded && <div className="lb-spinner" />}

          <div
            key={photo.id}
            className="lb-img-wrap"
            style={{
              '--photo-ratio': photo.width && photo.height ? photo.width / photo.height : 1,
              opacity: fade && loaded ? 1 : 0,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            }}
          >
            <img
              src={photoSrc(photo, mediaToken)}
              alt={photo.display_name || ''}
              className="lb-img"
              onLoad={() => setLoaded(true)}
              draggable={false}
            />
            <span className="lb-shield" aria-hidden="true" />
          </div>
        </div>

        <aside className={`lb-info ${showInfo ? 'open' : ''}`} aria-hidden={!showInfo}>
          <div className="lb-info-inner">
            <h3 className="lb-info-title">{photoTitle}</h3>
            {photo.album_name && <p className="lb-info-album">{photo.album_name}</p>}

            <div className="lb-info-section">
              <div className="lb-info-row"><IconLayers /><span>{photo.width} × {photo.height} px{megapixels && ` · ${megapixels} MP`}</span></div>
              {uploadDate && <div className="lb-info-row"><IconCalendar /><span>Dodano {uploadDate}</span></div>}
            </div>

            {hasExif && (
              <div className="lb-info-section">
                <p className="lb-info-heading">Aparat</p>
                {(photo.camera_make || photo.camera_model) && (
                  <div className="lb-info-row"><IconCamera /><span>{[photo.camera_make, photo.camera_model].filter(Boolean).join(' ')}</span></div>
                )}
                {photo.lens && <div className="lb-info-row"><IconAperture /><span>{photo.lens}</span></div>}
                {(photo.aperture || photo.shutter_speed || photo.iso || photo.focal_length) && (
                  <div className="lb-info-row lb-info-tags">
                    {photo.focal_length && <span className="tag">{photo.focal_length}</span>}
                    {photo.aperture && <span className="tag">{photo.aperture}</span>}
                    {photo.shutter_speed && <span className="tag">{photo.shutter_speed}</span>}
                    {photo.iso && <span className="tag">ISO {photo.iso}</span>}
                  </div>
                )}
                {takenDate && <div className="lb-info-row"><IconClock /><span>Wykonano {takenDate}</span></div>}
              </div>
            )}

            {!adminMode && (
              <p className="lb-info-note">
                Zdjęcia są udostępnione wyłącznie do oglądania. Chcesz użyć któregoś z nich – napisz,
                a dostaniesz plik w pełnej jakości.
              </p>
            )}

            {adminMode && photo.filename && (
              <a className="lb-info-note" href={fileUrl(photo.filename, mediaToken)} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                Otwórz plik źródłowy (widoczne tylko dla Ciebie)
              </a>
            )}
          </div>
        </aside>
      </div>

      {total > 1 && (
        <div className="lb-thumbs" ref={thumbRef}>
          {photos.map((p, i) => (
            <img
              key={p.id}
              src={thumbUrl(p.thumb, mediaToken)}
              alt=""
              className={`lb-thumb ${i === idx ? 'active' : ''}`}
              onClick={() => { setPlaying(false); go(i) }}
              draggable={false}
            />
          ))}
        </div>
      )}

      {showKeys && (
        <div className="lb-keys" onClick={() => setShowKeys(false)}>
          <dl>
            {SHORTCUTS.map(([key, label]) => (
              <div key={key} style={{ display: 'contents' }}>
                <dt>{key}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
