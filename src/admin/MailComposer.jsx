import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import {
  Bold, Italic, Link2, List, ListOrdered, LoaderCircle, Paperclip, Quote, RemoveFormatting, Save, Send, Trash2, Underline, X,
} from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { toast } from './parts'

const MAX_ATTACHMENTS = 8 * 1024 * 1024

/**
 * HTML z cudzej wiadomości trafia do edytora w domenie panelu, więc przechodzi
 * przez DOMPurify. Zdalne obrazy wypadają: otwarcie edytora nie może powiadomić
 * nadawcy o przeczytaniu.
 */
export function cleanForEditor(html) {
  const clean = DOMPurify.sanitize(html || '', { FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'], FORBID_ATTR: ['class', 'id'], RETURN_DOM_FRAGMENT: true })
  clean.querySelectorAll('img').forEach(image => {
    if (!/^data:image\//.test(image.getAttribute('src') || '')) image.remove()
  })
  // Własna wiadomość z panelu: do edytora wraca sama treść, bez ramy z logo.
  const own = clean.querySelector('[data-ar-body]')
  const box = document.createElement('div')
  if (own) box.append(...own.childNodes)
  else box.append(clean)
  return box.innerHTML
}

const escapeText = text => {
  const box = document.createElement('div')
  box.textContent = text || ''
  return box.innerHTML.replaceAll('\n', '<br>')
}

const formatPerson = entry => (entry.name ? `${entry.name} <${entry.address}>` : entry.address)
export const formatPeople = list => (list || []).map(formatPerson).join(', ')

/** Treść cytowana pod odpowiedzią: nagłówek i oryginał. */
export function quoteBlock({ author, date, html, text }) {
  const body = html ? cleanForEditor(html) : escapeText(text)
  return `<p><br></p><p>${escapeText(`${formatDate(date)}, ${author} napisał(a):`)}</p><blockquote style="margin:12px 0;padding:12px 16px;background:#f7f5f0;border:1px solid #e4ded2;border-radius:10px;color:#5f594f">${body}</blockquote>`
}

const readBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
  reader.onerror = () => reject(new Error(`Nie udało się odczytać pliku ${file.name}.`))
  reader.readAsDataURL(file)
})

const TOOLS = [
  ['bold', Bold, 'Pogrubienie'],
  ['italic', Italic, 'Kursywa'],
  ['underline', Underline, 'Podkreślenie'],
  ['insertUnorderedList', List, 'Lista'],
  ['insertOrderedList', ListOrdered, 'Lista numerowana'],
]

/**
 * Okno nowej wiadomości. `draft` opisuje stan początkowy: odbiorców, temat, HTML
 * i powiązania (odpowiedź na wiadomość, zgłoszenie z formularza, szkic z IMAP).
 */
export default function MailComposer({ draft, identity, onClose, onSent }) {
  const editor = useRef(null)
  const fileInput = useRef(null)
  const [to, setTo] = useState(draft.to || '')
  const [cc, setCc] = useState(draft.cc || '')
  const [bcc, setBcc] = useState(draft.bcc || '')
  const [showCopies, setShowCopies] = useState(Boolean(draft.cc || draft.bcc))
  const [subject, setSubject] = useState(draft.subject || '')
  const [files, setFiles] = useState([])
  const [draftUid, setDraftUid] = useState(draft.draftUid || 0)
  const [busy, setBusy] = useState('')

  useEffect(() => {
    // draft.html jest już oczyszczony przez cleanForEditor/quoteBlock.
    editor.current.innerHTML = draft.html || '<p><br></p>'
  }, [draft])

  const command = (name, value) => {
    editor.current.focus()
    document.execCommand(name, false, value)
  }

  const addLink = () => {
    const url = window.prompt('Adres odnośnika', 'https://')
    if (url && /^(https?:|mailto:)/i.test(url)) command('createLink', url)
  }

  const onPaste = event => {
    const html = event.clipboardData.getData('text/html')
    if (!html) return
    event.preventDefault()
    document.execCommand('insertHTML', false, cleanForEditor(html))
  }

  const addFiles = async list => {
    try {
      const added = await Promise.all([...list].map(async file => ({ name: file.name, type: file.type, size: file.size, data: await readBase64(file) })))
      const next = [...files, ...added]
      if (next.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENTS) throw new Error('Załączniki mogą mieć razem najwyżej 8 MB.')
      setFiles(next)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const payload = () => ({
    to, cc, bcc, subject,
    html: editor.current.innerHTML,
    text: editor.current.innerText,
    attachments: files.map(({ name, type, data }) => ({ name, type, data })),
    inReplyTo: draft.inReplyTo,
    references: draft.references,
    original: draft.original,
    submissionId: draft.submissionId,
    draftUid,
  })

  const send = async () => {
    setBusy('send')
    try {
      const result = await api('/api/admin/mail/send', json('POST', payload()))
      if (result.warning) toast.error(result.warning)
      else toast.success('Wiadomość wysłana.')
      onSent()
    } catch (error) {
      toast.error(error.message)
      setBusy('')
    }
  }

  const saveDraft = async () => {
    setBusy('draft')
    try {
      const result = await api('/api/admin/mail/draft', json('POST', payload()))
      setDraftUid(result.uid)
      toast.success('Szkic zapisany.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy('')
    }
  }

  const discard = () => {
    if (window.confirm('Zamknąć wiadomość? Niezapisane zmiany przepadną.')) onClose()
  }

  return (
    <div className="ap-compose-layer" role="dialog" aria-modal="true" aria-label="Nowa wiadomość">
      <div className="ap-compose">
        <header>
          <b>{draft.title || 'Nowa wiadomość'}</b>
          <button className="ap-icon-btn" onClick={discard} aria-label="Zamknij"><X size={15} /></button>
        </header>

        <div className="ap-compose-fields">
          <p><span>Od</span><em>{identity?.name} &lt;{identity?.address}&gt;</em></p>
          <label>
            <span>Do</span>
            <input value={to} onChange={event => setTo(event.target.value)} placeholder="adres@example.com, kolejny@example.com" autoFocus={!draft.to} />
            {!showCopies && <button type="button" onClick={() => setShowCopies(true)}>DW / UDW</button>}
          </label>
          {showCopies && <label><span>DW</span><input value={cc} onChange={event => setCc(event.target.value)} /></label>}
          {showCopies && <label><span>UDW</span><input value={bcc} onChange={event => setBcc(event.target.value)} /></label>}
          <label><span>Temat</span><input value={subject} onChange={event => setSubject(event.target.value)} /></label>
        </div>

        <div className="ap-compose-tools" role="toolbar" aria-label="Formatowanie">
          {TOOLS.map(([name, Icon, label]) => (
            <button type="button" key={name} title={label} aria-label={label} onMouseDown={event => event.preventDefault()} onClick={() => command(name)}><Icon size={15} /></button>
          ))}
          <button type="button" title="Cytat" aria-label="Cytat" onMouseDown={event => event.preventDefault()} onClick={() => command('formatBlock', 'blockquote')}><Quote size={15} /></button>
          <button type="button" title="Odnośnik" aria-label="Odnośnik" onMouseDown={event => event.preventDefault()} onClick={addLink}><Link2 size={15} /></button>
          <button type="button" title="Usuń formatowanie" aria-label="Usuń formatowanie" onMouseDown={event => event.preventDefault()} onClick={() => command('removeFormat')}><RemoveFormatting size={15} /></button>
        </div>

        <div className="ap-compose-editor" ref={editor} contentEditable suppressContentEditableWarning onPaste={onPaste} role="textbox" aria-multiline="true" aria-label="Treść wiadomości" />

        {files.length > 0 && (
          <ul className="ap-mail-files">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                {file.name}
                <button type="button" onClick={() => setFiles(files.filter((_, position) => position !== index))} aria-label={`Usuń ${file.name}`}><X size={12} /></button>
              </li>
            ))}
          </ul>
        )}

        <footer>
          <button className="ap-btn ap-btn-primary" onClick={send} disabled={Boolean(busy)}>
            {busy === 'send' ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />} Wyślij
          </button>
          <button className="ap-btn ap-btn-ghost" onClick={saveDraft} disabled={Boolean(busy)}>
            {busy === 'draft' ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />} Zapisz szkic
          </button>
          <button className="ap-btn ap-btn-ghost" onClick={() => fileInput.current.click()}><Paperclip size={14} /> Załącz</button>
          <input ref={fileInput} type="file" multiple hidden onChange={event => { addFiles(event.target.files); event.target.value = '' }} />
          <button className="ap-icon-btn is-danger" onClick={discard} aria-label="Odrzuć wiadomość"><Trash2 size={14} /></button>
        </footer>
      </div>
    </div>
  )
}
