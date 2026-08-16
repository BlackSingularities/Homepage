import { useState } from 'react'
import { Check, Copy, Trash2 } from 'lucide-react'
import { formatDay, formatSize } from '../lib/api'
import { Dropzone, Empty, Notice, useMedia } from './parts'

export default function MediaManager({ notify }) {
  const { items, busy, error, upload, remove, setError } = useMedia()
  const [copied, setCopied] = useState('')

  const copy = async url => {
    const absolute = `${window.location.origin}${url}`
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(url)
      setTimeout(() => setCopied(''), 1600)
    } catch {
      window.prompt('Skopiuj adres zdjęcia:', absolute)
    }
  }

  return (
    <div className="ap-media">
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <Dropzone busy={busy} onFiles={async files => {
        const uploaded = await upload(files)
        if (uploaded.length) notify(`Wgrano ${uploaded.length} ${uploaded.length === 1 ? 'plik' : 'pliki'}.`)
      }} />

      <div className="ap-media-grid is-large">
        {items.map(item => (
          <figure key={item.name}>
            <span className="ap-media-thumb"><img src={item.url} alt={item.name} loading="lazy" /></span>
            <figcaption>
              <span title={item.name}>{item.name}</span>
              <i>{formatSize(item.size)} · {formatDay(item.createdAt)}</i>
            </figcaption>
            <div className="ap-media-actions">
              <button type="button" onClick={() => copy(item.url)}>
                {copied === item.url ? <><Check size={13} /> Skopiowano</> : <><Copy size={13} /> Kopiuj adres</>}
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={async () => {
                  if (!window.confirm(`Usunąć plik ${item.name}?`)) return
                  await remove(item.name)
                  notify('Plik został usunięty.')
                }}
              >
                <Trash2 size={13} /> Usuń
              </button>
            </div>
          </figure>
        ))}
        {!items.length && !busy && <Empty>Biblioteka jest pusta. Wgraj pierwsze zdjęcia.</Empty>}
      </div>
    </div>
  )
}
