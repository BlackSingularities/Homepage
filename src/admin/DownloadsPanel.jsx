import { useEffect, useMemo, useState } from 'react'
import { Archive, Download, Files, LoaderCircle } from 'lucide-react'
import { api } from '../lib/api'
import { PLATFORM_LABEL, formatBytes } from '../lib/projects'
import PlatformIcon, { fileVariant } from '../lib/PlatformIcon'
import { Empty, GithubRefreshButton, Notice } from './parts'

const VARIANT_LABEL = { ...PLATFORM_LABEL, 'windows-portable': 'Windows portable', other: 'Plik' }
const FILTERS = [
  ['all', 'Wszystko'],
  ['android', 'Android'],
  ['windows', 'Windows'],
  ['ios', 'iOS'],
]

const COLUMN_MIN = 330

/**
 * Układ „murowany”: karty idą po kolei od lewej, każda do najniższej
 * kolumny. Wysokość karty to nagłówek plus wiersze plików, więc wystarczy
 * liczyć wiersze – bez mierzenia DOM.
 */
function useMasonry(items) {
  // Lista pojawia się dopiero po wczytaniu danych, stąd ref jako stan.
  const [node, ref] = useState(null)
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!node) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setCount(Math.max(1, Math.floor((entry.contentRect.width + 10) / (COLUMN_MIN + 10))))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  const columns = useMemo(() => {
    const result = Array.from({ length: count }, () => ({ height: 0, items: [] }))
    for (const item of items) {
      const shortest = result.reduce((low, column) => (column.height < low.height ? column : low))
      shortest.items.push(item)
      shortest.height += 1.6 + item.files.length
    }
    return result.map(column => column.items)
  }, [items, count])

  return [ref, columns]
}

/** Uruchamia pobranie pliku bez otwierania nowej karty. */
function trigger(href) {
  const link = document.createElement('a')
  link.href = href
  link.download = ''
  document.body.append(link)
  link.click()
  link.remove()
}

/**
 * Wszystkie pliki aplikacji z portfolio na jednym ekranie: jeden ZIP albo
 * każdy plik osobno. Pobieranie idzie przez API panelu, więc działa także dla
 * aplikacji ukrytych na stronie i prywatnych repozytoriów.
 */
export default function DownloadsPanel() {
  const [apps, setApps] = useState(null)
  const [error, setError] = useState('')
  const [platform, setPlatform] = useState('all')
  const [queue, setQueue] = useState(null)

  const load = () => api('/api/admin/downloads')
    .then(data => setApps(data.apps))
    .catch(requestError => setError(requestError.message))

  useEffect(() => { load() }, [])

  const visible = useMemo(() => (apps || [])
    .map(app => ({ ...app, files: app.files.filter(file => platform === 'all' || file.platform === platform) }))
    .filter(app => app.files.length), [apps, platform])
  const [listRef, columns] = useMasonry(visible)
  const files = visible.flatMap(app => app.files)
  const total = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0)
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([id]) => [id,
    (apps || []).flatMap(app => app.files).filter(file => id === 'all' || file.platform === id).length])), [apps])

  // Przeglądarka przyjmuje kolejne pobrania chętniej, gdy nie lecą naraz.
  const downloadEach = async () => {
    setQueue({ done: 0, total: files.length })
    for (const [index, file] of files.entries()) {
      trigger(file.href)
      setQueue({ done: index + 1, total: files.length })
      await new Promise(resolve => setTimeout(resolve, 900))
    }
    setTimeout(() => setQueue(null), 1500)
  }

  if (error) return <Notice tone="error">{error}</Notice>
  if (!apps) return <div className="ap-loading"><LoaderCircle className="spin" size={18} /> Wczytywanie plików…</div>

  return (
    <div className="ap-downloads">
      <div className="ap-dl-bar">
        <div className="ap-segmented" role="radiogroup" aria-label="Platforma">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={platform === id} className={platform === id ? 'is-active' : ''} onClick={() => setPlatform(id)}>
              {label} <b>{counts[id]}</b>
            </button>
          ))}
        </div>
        <div className="ap-dl-actions">
          <GithubRefreshButton compact onDone={load} />
          <button
            type="button"
            className="ap-btn ap-btn-ghost ap-btn-sm"
            onClick={downloadEach}
            disabled={Boolean(queue) || !files.length}
            title="Przeglądarka może raz zapytać o zgodę na wiele plików naraz."
          >
            {queue ? <LoaderCircle className="spin" size={14} /> : <Files size={14} />}
            {queue ? `${queue.done} z ${queue.total}…` : `Osobno (${files.length})`}
          </button>
          <a className="ap-btn ap-btn-primary ap-btn-sm" href={`/api/admin/downloads/zip?platform=${platform}`} download>
            <Archive size={14} /> ZIP <span className="mono">{formatBytes(total)}</span>
          </a>
        </div>
      </div>

      {!visible.length && <Empty>Brak plików dla tej platformy.</Empty>}

      <div className="ap-dl-list" ref={listRef}>
        {columns.map((column, index) => (
          <div className="ap-dl-col" key={index}>
            {column.map(app => (
          <section key={app.slug} className="ap-dl-app">
            <header>
              <strong>{app.name}</strong>
              {app.version && <span className="mono">{app.version}</span>}
              {!app.published && <em>ukryta</em>}
              {app.error && <em className="is-error" title={app.error}>błąd odświeżania</em>}
            </header>
            <ul>
              {app.files.map(file => {
                const variant = fileVariant(file)
                return (
                  <li key={file.id}>
                    <a href={file.href} download title={file.name}>
                      <PlatformIcon platform={variant} size={15} aria-hidden="true" />
                      <b>{VARIANT_LABEL[variant] || variant}</b>
                      <i className="mono">{file.name}</i>
                      <span className="mono">{formatBytes(file.size)}</span>
                      <Download size={14} aria-hidden="true" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
