import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown, ArrowUp, Check, CircleAlert, CircleCheck, ImagePlus, Info, LoaderCircle, Plus, RefreshCw, Trash2, Upload, X,
} from 'lucide-react'
import { api, json, uploadImage } from '../lib/api'

/* ── toasts ─────────────────────────────────────────────────────── */

const TOAST_EVENT = 'admin:toast'
const TOAST_TIME = { success: 4500, info: 5500, error: 9000 }
const TOAST_ICON = { success: CircleCheck, info: Info, error: CircleAlert }

function emitToast(tone, message) {
  if (!message) return
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { tone, message: String(message) } }))
}

/** Wyskakujące powiadomienia panelu – można je wołać z każdego miejsca. */
export const toast = {
  success: message => emitToast('success', message),
  info: message => emitToast('info', message),
  error: message => emitToast('error', message),
}

let toastSeq = 0

/** Stos powiadomień w prawym górnym rogu; błędy wiszą dłużej. */
export function Toaster() {
  const [items, setItems] = useState([])

  const dismiss = useCallback(id => setItems(current => current.filter(item => item.id !== id)), [])

  useEffect(() => {
    const onToast = event => {
      const { tone, message } = event.detail
      const id = ++toastSeq
      // To samo powiadomienie drugi raz nie dubluje się, tylko wraca na wierzch.
      setItems(current => [...current.filter(item => item.message !== message).slice(-3), { id, tone, message }])
      setTimeout(() => dismiss(id), TOAST_TIME[tone] || 5000)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [dismiss])

  return (
    <div className="ap-toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map(item => {
          const Icon = TOAST_ICON[item.tone] || Info
          return (
            <motion.div
              key={item.id}
              layout
              className={`ap-toast is-${item.tone}`}
              initial={{ opacity: 0, x: 40, scale: .96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: .18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <Icon size={16} />
              <span>{item.message}</span>
              <button type="button" onClick={() => dismiss(item.id)} aria-label="Zamknij"><X size={13} /></button>
              <i style={{ animationDuration: `${TOAST_TIME[item.tone] || 5000}ms` }} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* ── github ─────────────────────────────────────────────────────── */

/**
 * Strona trzyma wydania z GitHuba przez 30 minut – to pobiera wszystkie od
 * razu, także dla aktualizacji w aplikacjach. Wynik idzie w powiadomieniach.
 */
export function GithubRefreshButton({ onDone, compact }) {
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setBusy(true)
    try {
      const result = await api('/api/admin/github/refresh-all', json('POST', {}))
      await onDone?.()
      const failed = result.results.filter(item => item.error)
      if (failed.length) toast.error(`Nie udało się sprawdzić: ${failed.map(item => item.name || item.repo).join(', ')}.`)
      const fresh = result.results.filter(item => item.changed)
      if (fresh.length) {
        const list = fresh
          .map(item => `${item.name} ${item.tag}${item.previous && item.previous !== item.tag ? ` (było ${item.previous})` : ''}`)
          .join(', ')
        toast.success(`Pobrano na nowo ${fresh.length}: ${list}. Bez zmian: ${result.checked - fresh.length}.`)
      } else {
        toast.success(`Pobrano na nowo 0 – wszystkie wydania (${result.checked}) są aktualne.`)
      }
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`ap-btn ap-btn-ghost ${compact ? 'ap-btn-sm' : ''}`}
      onClick={refresh}
      disabled={busy}
      title="Sprawdza wydania na GitHubie i pobiera na nowo tylko te, które się zmieniły."
    >
      <RefreshCw className={busy ? 'spin' : ''} size={14} />
      {busy ? 'Pobieram z GitHuba…' : 'Odśwież wydania z GitHuba'}
    </button>
  )
}

/* ── primitives ─────────────────────────────────────────────────── */

export function Field({ label, hint, children, wide }) {
  return (
    <label className={`ap-field ${wide ? 'is-wide' : ''}`}>
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
    <button type="button" className={`ap-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
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

/** Przełącznik kilku wariantów w jednym rzędzie – zamiast listy rozwijanej. */
export function Segmented({ label, value, onChange, options, hint }) {
  return (
    <div className="ap-field">
      {label && <span>{label}</span>}
      <div className="ap-segmented" role="radiogroup" aria-label={label}>
        {options.map(([id, text, Icon]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            className={value === id ? 'is-active' : ''}
            onClick={() => onChange(id)}
          >
            {Icon && <Icon size={14} />}{text}
          </button>
        ))}
      </div>
      {hint && <i>{hint}</i>}
    </div>
  )
}

export function Notice({ tone = 'info', children, onClose }) {
  if (!children) return null
  return (
    <motion.div className={`ap-notice is-${tone}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} aria-label="Zamknij"><X size={14} /></button>}
    </motion.div>
  )
}

export function Empty({ children }) {
  return <div className="ap-empty">{children}</div>
}

export function Card({ title, description, children, actions }) {
  return (
    <section className="ap-card">
      {(title || actions) && (
        <header>
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="ap-card-body">{children}</div>
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
    <div className="ap-repeater">
      {items.map((item, index) => (
        <article key={item.id || index}>
          <header>
            <b>{itemLabel ? itemLabel(item, index) : `Pozycja ${index + 1}`}</b>
            <div className="ap-repeater-tools">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="W górę"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="W dół"><ArrowDown size={14} /></button>
              <button type="button" className="is-danger" onClick={() => remove(index)} aria-label="Usuń"><Trash2 size={14} /></button>
            </div>
          </header>
          <div className="ap-repeater-body">{render(item, value => patch(index, value), index)}</div>
        </article>
      ))}
      <button type="button" className="ap-add" onClick={() => onChange([...items, create()])}>
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

  const [progress, setProgress] = useState(null)

  /**
   * Wysyła kilka plików naraz (po 3). `onEach` dostaje każdy plik zaraz po
   * wysłaniu, więc zdjęcia pojawiają się od razu, a błąd jednego nie
   * przekreśla pozostałych.
   */
  const upload = useCallback(async (files, onEach) => {
    const list = Array.from(files || [])
    if (!list.length) return []
    setBusy(true)
    setError('')
    setProgress({ done: 0, total: list.length })
    const uploaded = new Array(list.length)
    const failures = []
    let next = 0
    const worker = async () => {
      while (next < list.length) {
        const index = next++
        try {
          uploaded[index] = await uploadImage(list[index])
          onEach?.(uploaded[index], index)
        } catch (requestError) {
          failures.push(`${list[index].name}: ${requestError.message}`)
        }
        setProgress(current => current && { ...current, done: current.done + 1 })
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(3, list.length) }, worker))
      if (failures.length) setError(failures.join(' · '))
      await refresh()
    } finally {
      setBusy(false)
      setProgress(null)
    }
    return uploaded.filter(Boolean)
  }, [refresh])

  // Zamknięcie karty przerywa wysyłkę – przeglądarka ostrzeże przed wyjściem.
  useEffect(() => {
    if (!busy) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const remove = useCallback(async name => {
    await api(`/api/admin/media/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await refresh()
  }, [refresh])

  return { items, busy, progress, error, refresh, upload, remove, setError }
}

export function Dropzone({ onFiles, busy, compact, progress }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  return (
    <div
      className={`ap-dropzone ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
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
      <b>{busy
        ? (progress?.total > 1 ? `Wysyłam ${progress.done} z ${progress.total}…` : 'Wysyłam plik…')
        : 'Przeciągnij zdjęcia albo kliknij'}</b>
      {!compact && <span>PNG, JPG, WEBP, AVIF lub GIF – do 10 MB każde.</span>}
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
    <div className="ap-modal" onClick={onClose}>
      <motion.div
        className="ap-modal-panel"
        onClick={event => event.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: .25 }}
      >
        <header>
          <h2>Biblioteka zdjęć</h2>
          <button onClick={onClose} aria-label="Zamknij"><X size={18} /></button>
        </header>
        <div className="ap-modal-body">
          <Dropzone busy={busy} onFiles={async files => {
            const uploaded = await upload(files)
            if (uploaded[0]) onPick(uploaded[0].url)
          }} />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="ap-media-grid">
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
    <div className="ap-image-picker">
      <span className="ap-field-label">{label}</span>
      <div className={`ap-image-slot ${value ? 'has-image' : ''}`}>
        {value ? <img src={value} alt="" /> : <ImagePlus size={22} />}
        <div className="ap-image-actions">
          <button type="button" onClick={() => setOpen(true)}>{value ? 'Zmień' : 'Wybierz zdjęcie'}</button>
          {value && <button type="button" className="is-danger" onClick={() => onChange('')}>Usuń</button>}
        </div>
      </div>
      {hint && <i className="ap-hint">{hint}</i>}
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
          className="ap-savebar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: .25 }}
        >
          <span>{info || 'Masz niezapisane zmiany.'}</span>
          <div>
            {onReset && <button type="button" className="ap-btn ap-btn-ghost" onClick={onReset}>{resetLabel}</button>}
            <button type="button" className="ap-btn ap-btn-primary" onClick={onSave} disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Zapisz
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const LANG_TABS = [['pl', 'Polski', 'PL'], ['en', 'English', 'EN']]

/** Przełącznik wersji językowej edytowanej treści. */
export function LangTabs({ value, onChange, hint }) {
  return (
    <div className="ap-lang-tabs">
      <div role="tablist" aria-label="Wersja językowa">
        {LANG_TABS.map(([code, label, short]) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={value === code}
            className={value === code ? 'is-active' : ''}
            onClick={() => onChange(code)}
          >
            <b>{short}</b> {label}
          </button>
        ))}
      </div>
      {hint && <p>{hint}</p>}
    </div>
  )
}
