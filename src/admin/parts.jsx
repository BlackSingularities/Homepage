import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown, ArrowUp, Check, ImagePlus, LoaderCircle, Plus, Trash2, Upload, X,
} from 'lucide-react'
import { api, uploadImage } from '../lib/api'

/* ── primitives ─────────────────────────────────────────────────── */

export function Field({ label, hint, children, wide }) {
  return (
    <label className={`ad-field ${wide ? 'is-wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <i>{hint}</i>}
    </label>
  )
}

export function Text({ label, value, onChange, placeholder, hint, wide, type = 'text' }) {
  return (
    <Field label={label} hint={hint} wide={wide}>
      <input type={type} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </Field>
  )
}

export function Area({ label, value, onChange, placeholder, hint, rows = 4, wide = true }) {
  return (
    <Field label={label} hint={hint} wide={wide}>
      <textarea rows={rows} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </Field>
  )
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <button type="button" className={`ad-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <i><b /></i>
      <span>{label}{hint && <em>{hint}</em>}</span>
    </button>
  )
}

export function Select({ label, value, onChange, options, hint }) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </Field>
  )
}

export function Notice({ tone = 'info', children, onClose }) {
  if (!children) return null
  return (
    <motion.div className={`ad-notice is-${tone}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} aria-label="Zamknij"><X size={14} /></button>}
    </motion.div>
  )
}

export function Empty({ children }) {
  return <div className="ad-empty">{children}</div>
}

export function Card({ title, description, children, actions }) {
  return (
    <section className="ad-card">
      {(title || actions) && (
        <header>
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="ad-card-body">{children}</div>
    </section>
  )
}

/* ── repeater ───────────────────────────────────────────────────── */

export function Repeater({ items = [], onChange, render, create, addLabel = 'Dodaj pozycję', itemLabel }) {
  const move = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }
  const patch = (index, value) => onChange(items.map((item, i) => (i === index ? { ...item, ...value } : item)))
  const remove = index => onChange(items.filter((_, i) => i !== index))

  return (
    <div className="ad-repeater">
      {items.map((item, index) => (
        <article key={item.id || index}>
          <header>
            <b>{itemLabel ? itemLabel(item, index) : `Pozycja ${index + 1}`}</b>
            <div className="ad-repeater-tools">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="W górę"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="W dół"><ArrowDown size={14} /></button>
              <button type="button" className="is-danger" onClick={() => remove(index)} aria-label="Usuń"><Trash2 size={14} /></button>
            </div>
          </header>
          <div className="ad-repeater-body">{render(item, value => patch(index, value), index)}</div>
        </article>
      ))}
      <button type="button" className="ad-add" onClick={() => onChange([...items, create()])}>
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  )
}

/* ── media ──────────────────────────────────────────────────────── */

export function useMedia() {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setItems(await api('/api/admin/media'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const upload = useCallback(async files => {
    setBusy(true)
    setError('')
    const uploaded = []
    try {
      for (const file of Array.from(files || [])) {
        uploaded.push(await uploadImage(file))
      }
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
    return uploaded
  }, [refresh])

  const remove = useCallback(async name => {
    await api(`/api/admin/media/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await refresh()
  }, [refresh])

  return { items, busy, error, refresh, upload, remove, setError }
}

export function Dropzone({ onFiles, busy, compact }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  return (
    <div
      className={`ad-dropzone ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
      onDragOver={event => { event.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault()
        setOver(false)
        onFiles(event.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={event => event.key === 'Enter' && inputRef.current?.click()}
    >
      {busy ? <LoaderCircle className="spin" size={20} /> : <Upload size={20} />}
      <b>{busy ? 'Wysyłam pliki…' : 'Przeciągnij zdjęcia albo kliknij'}</b>
      {!compact && <span>PNG, JPG, WEBP, AVIF lub GIF — do 10 MB każde.</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        multiple
        hidden
        onChange={event => { onFiles(event.target.files); event.target.value = '' }}
      />
    </div>
  )
}

export function MediaPicker({ open, onClose, onPick }) {
  const { items, busy, error, upload, remove } = useMedia()
  if (!open) return null

  return (
    <div className="ad-modal" onClick={onClose}>
      <motion.div
        className="ad-modal-panel"
        onClick={event => event.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: .25 }}
      >
        <header>
          <h2>Biblioteka zdjęć</h2>
          <button onClick={onClose} aria-label="Zamknij"><X size={18} /></button>
        </header>
        <div className="ad-modal-body">
          <Dropzone busy={busy} onFiles={async files => {
            const uploaded = await upload(files)
            if (uploaded[0]) onPick(uploaded[0].url)
          }} />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="ad-media-grid">
            {items.map(item => (
              <figure key={item.name}>
                <button type="button" onClick={() => { onPick(item.url); onClose() }}>
                  <img src={item.url} alt={item.name} loading="lazy" />
                </button>
                <figcaption>
                  <span title={item.name}>{item.name}</span>
                  <button type="button" onClick={() => remove(item.name)} aria-label="Usuń plik"><Trash2 size={13} /></button>
                </figcaption>
              </figure>
            ))}
            {!items.length && <Empty>Nie masz jeszcze żadnych zdjęć.</Empty>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function ImagePicker({ label, value, onChange, hint }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ad-image-picker">
      <span className="ad-field-label">{label}</span>
      <div className={`ad-image-slot ${value ? 'has-image' : ''}`}>
        {value ? <img src={value} alt="" /> : <ImagePlus size={22} />}
        <div className="ad-image-actions">
          <button type="button" onClick={() => setOpen(true)}>{value ? 'Zmień' : 'Wybierz zdjęcie'}</button>
          {value && <button type="button" className="is-danger" onClick={() => onChange('')}>Usuń</button>}
        </div>
      </div>
      {hint && <i className="ad-hint">{hint}</i>}
      <AnimatePresence>
        {open && <MediaPicker open={open} onClose={() => setOpen(false)} onPick={url => { onChange(url); setOpen(false) }} />}
      </AnimatePresence>
    </div>
  )
}

export function SaveBar({ dirty, saving, onSave, onReset, resetLabel = 'Przywróć domyślne', info }) {
  return (
    <AnimatePresence>
      {(dirty || saving) && (
        <motion.div
          className="ad-savebar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: .25 }}
        >
          <span>{info || 'Masz niezapisane zmiany.'}</span>
          <div>
            {onReset && <button type="button" className="ad-btn ad-btn-ghost" onClick={onReset}>{resetLabel}</button>}
            <button type="button" className="ad-btn ad-btn-primary" onClick={onSave} disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Zapisz
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
