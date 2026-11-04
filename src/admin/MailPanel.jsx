import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import {
  Archive, ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Folder, Forward, History, ImageOff, Inbox, Mail, MailOpen, Paperclip,
  PenLine, Reply, ReplyAll, Search, Send, ShieldAlert, Star, Trash2,
} from 'lucide-react'
import { api, formatDate, json } from '../lib/api'
import { Empty, toast } from './parts'
import { cleanForEditor, formatPeople, quoteBlock } from './MailComposer'

const FOLDER_ICON = {
  '\\Inbox': Inbox, '\\Sent': Send, '\\Drafts': FileText, '\\Junk': ShieldAlert, '\\Trash': Trash2, '\\Archive': Archive,
}
const AUTOMATIC = '__automatic__'

const query = params => new URLSearchParams(params).toString()
const senderName = entry => entry?.name || entry?.address || '(brak nadawcy)'
const prefixed = (prefix, subject) => (new RegExp(`^${prefix}:`, 'i').test(subject || '') ? subject : `${prefix}: ${subject || ''}`)
const formatKb = bytes => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`)

/**
 * Treść HTML w piaskownicy: bez skryptów, formularzy i wyjścia do sieci. Zdalne
 * obrazy blokuje CSP, dopóki użytkownik ich nie włączy – to one zdradzają nadawcy
 * fakt otwarcia. `allow-same-origin` służy tylko do odczytania wysokości; bez
 * `allow-scripts` kod z wiadomości i tak się nie uruchomi.
 */
function MessageBody({ message }) {
  const frame = useRef(null)
  const [images, setImages] = useState(false)
  const clean = useMemo(() => DOMPurify.sanitize(message.html || '', {
    FORCE_BODY: true, ADD_TAGS: ['style'], FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
  }), [message.html])
  const hasRemote = /(?:src=|url\()["']?\s*https?:/i.test(clean)

  useEffect(() => { setImages(false) }, [message.uid])

  if (!message.html) return <pre className="ap-mail-text">{message.text || 'Wiadomość jest pusta.'}</pre>

  const csp = `default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:${images ? ' https: http:' : ''}`
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>html{background:#fff}body{margin:16px;color:#1b1b1f;font:14px/1.55 Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}blockquote{margin:0 0 0 12px;padding:0 0 0 12px;color:#555}</style></head><body>${clean}</body></html>`

  const fit = () => {
    const doc = frame.current?.contentDocument
    if (doc?.documentElement) frame.current.style.height = `${doc.documentElement.scrollHeight + 4}px`
  }

  return (
    <>
      {hasRemote && !images && (
        <p className="ap-mail-remote">
          <ImageOff size={14} /> Zdalne obrazy są zablokowane, żeby nadawca nie wiedział o otwarciu.
          <button onClick={() => setImages(true)}>Pokaż obrazy</button>
        </p>
      )}
      <iframe
        ref={frame}
        className="ap-mail-frame"
        title="Treść wiadomości"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        onLoad={fit}
      />
    </>
  )
}

function Reader({ folder, message, folders, onBack, onCompose, onAct }) {
  const moveTarget = special => folders.find(item => item.special === special)?.path
  const archive = moveTarget('\\Archive')
  const junk = moveTarget('\\Junk')
  const inbox = moveTarget('\\Inbox')
  const author = senderName(message.from[0])
  const replyTarget = message.replyTo.length ? message.replyTo : message.from
  const threading = {
    inReplyTo: message.messageId,
    references: [message.references, message.messageId].filter(Boolean).join(' '),
    original: { folder, uid: message.uid },
  }
  const quote = () => quoteBlock({ author, date: message.date, html: message.html, text: message.text })

  const reply = all => onCompose({
    title: all ? 'Odpowiedz wszystkim' : 'Odpowiedz',
    to: formatPeople(replyTarget),
    cc: all ? formatPeople(message.cc.concat(message.to).filter(entry => !replyTarget.some(item => item.address === entry.address))) : '',
    subject: prefixed('Re', message.subject),
    html: quote(),
    ...threading,
  })

  const forward = () => onCompose({
    title: 'Przekaż dalej',
    subject: prefixed('Fwd', message.subject),
    html: quote(),
  })

  const editDraft = () => onCompose({
    title: 'Szkic',
    to: formatPeople(message.to),
    cc: formatPeople(message.cc),
    subject: message.subject,
    html: message.html ? cleanForEditor(message.html) : '',
    draftUid: message.uid,
  })

  return (
    <article className="ap-mail-reader">
      <div className="ap-mail-actions">
        <button className="ap-icon-btn ap-mail-back" onClick={onBack} aria-label="Wróć do listy"><ArrowLeft size={15} /></button>
        {message.draft ? (
          <button className="ap-btn ap-btn-primary" onClick={editDraft}><PenLine size={14} /> Edytuj szkic</button>
        ) : (
          <>
            <button className="ap-btn ap-btn-ghost" onClick={() => reply(false)}><Reply size={14} /> Odpowiedz</button>
            <button className="ap-btn ap-btn-ghost" onClick={() => reply(true)}><ReplyAll size={14} /> Wszystkim</button>
            <button className="ap-btn ap-btn-ghost" onClick={forward}><Forward size={14} /> Przekaż</button>
          </>
        )}
        <span className="ap-mail-actions-gap" />
        <button className={`ap-icon-btn ${message.flagged ? 'is-starred' : ''}`} onClick={() => onAct('flag', !message.flagged)} aria-pressed={message.flagged} aria-label="Oznacz gwiazdką"><Star size={14} /></button>
        <button className="ap-icon-btn" onClick={() => onAct('unread')} aria-label="Oznacz jako nieprzeczytaną"><Mail size={14} /></button>
        {archive && archive !== folder && <button className="ap-icon-btn" onClick={() => onAct('move', archive)} aria-label="Archiwizuj"><Archive size={14} /></button>}
        {junk && junk !== folder && <button className="ap-icon-btn" onClick={() => onAct('move', junk)} aria-label="Oznacz jako spam"><ShieldAlert size={14} /></button>}
        {junk === folder && inbox && <button className="ap-icon-btn" onClick={() => onAct('move', inbox)} aria-label="To nie spam"><MailOpen size={14} /></button>}
        <button className="ap-icon-btn is-danger" onClick={() => onAct('delete')} aria-label="Usuń"><Trash2 size={14} /></button>
      </div>

      <header className="ap-mail-head">
        <h2>{message.subject}</h2>
        <p><b>{formatPeople(message.from)}</b></p>
        <p>Do: {formatPeople(message.to) || '–'}</p>
        {message.cc.length > 0 && <p>DW: {formatPeople(message.cc)}</p>}
        <time>{formatDate(message.date)}</time>
      </header>

      {message.attachments.length > 0 && (
        <ul className="ap-mail-files">
          {message.attachments.map(file => (
            <li key={file.index}>
              <a href={`/api/admin/mail/attachment?${query({ folder, uid: message.uid, index: file.index })}`} download={file.name}>
                <Download size={13} /> {file.name} <i>{formatKb(file.size)}</i>
              </a>
            </li>
          ))}
        </ul>
      )}

      <MessageBody message={message} />
    </article>
  )
}

/** Dziennik maili wysyłanych przez stronę – potwierdzeń i powiadomień. */
function AutomaticLog() {
  const [items, setItems] = useState(null)
  useEffect(() => {
    api('/api/admin/outbox').then(setItems).catch(error => { toast.error(error.message); setItems([]) })
  }, [])
  const KIND = { confirmation: 'potwierdzenie dla klienta', manual: 'wysłana z panelu', notification: 'powiadomienie wewnętrzne' }
  if (items && !items.length) return <Empty>Historia wysyłek pojawi się tutaj.</Empty>
  return (
    <div className="ap-stack ap-mail-log">
      {(items || []).map(message => (
        <article className="ap-outbox" key={message.id}>
          <span className={`ap-status is-${message.status}`}>{message.status === 'sent' ? 'Wysłano' : message.status === 'failed' ? 'Błąd' : 'Wysyłanie'}</span>
          <span className="ap-row-main">
            <b>{message.subject}</b>
            <i>Do: {message.to} · {KIND[message.kind] || message.kind}</i>
          </span>
          <time>{formatDate(message.createdAt)}</time>
          {message.error && <p className="ap-error-text">{message.error}</p>}
        </article>
      ))}
    </div>
  )
}

export default function MailPanel({ refreshKey, onCompose, onChange, changeKey, onSettings }) {
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState('INBOX')
  const [list, setList] = useState({ messages: [], total: 0, page: 1, pageSize: 30 })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [message, setMessage] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadFolders = useCallback(async () => {
    try {
      const result = await api('/api/admin/mail/folders')
      setFolders(result.folders)
      setError('')
      return result
    } catch (requestError) {
      setError(requestError.message)
      return null
    }
  }, [])

  const loadList = useCallback(async () => {
    if (folder === AUTOMATIC) return
    setLoading(true)
    try {
      setList(await api(`/api/admin/mail/messages?${query({ folder, page, filter, q: appliedSearch })}`))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [folder, page, filter, appliedSearch])

  const reload = useCallback(() => {
    loadFolders()
    loadList()
    onChange()
  }, [loadFolders, loadList, onChange])

  useEffect(() => { loadFolders() }, [loadFolders, refreshKey, changeKey])
  useEffect(() => { loadList() }, [loadList, refreshKey, changeKey])

  // Nowa poczta bez ręcznego odświeżania, gdy panel jest na wierzchu.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) { loadFolders(); loadList() }
    }, 2 * 60 * 1000)
    return () => clearInterval(timer)
  }, [loadFolders, loadList])

  const chooseFolder = path => {
    setFolder(path)
    setPage(1)
    setSelected([])
    setMessage(null)
    setSearch('')
    setAppliedSearch('')
    setFilter('all')
  }

  const open = async item => {
    try {
      const loaded = await api(`/api/admin/mail/message?${query({ folder, uid: item.uid })}`)
      setMessage(loaded)
      if (!item.seen) reload()
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  const post = (path, body) => api(`/api/admin/mail/${path}`, json('POST', { folder, ...body }))

  const isTrash = folders.find(item => item.path === folder)?.special === '\\Trash'

  const bulk = async (action, uids, value) => {
    try {
      if (action === 'delete') {
        if (isTrash && !window.confirm(`Usunąć na stałe (${uids.length})? Tego nie da się cofnąć.`)) return
        await post('delete', { uids })
      }
      if (action === 'move') await post('move', { uids, target: value })
      if (action === 'seen') await post('flags', { uids, seen: value })
      if (action === 'flag') await post('flags', { uids, flagged: value })
      setSelected([])
      if (action === 'delete' || action === 'move') setMessage(null)
      reload()
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  const readerAct = (action, value) => {
    if (action === 'unread') { setMessage(null); return bulk('seen', [message.uid], false) }
    if (action === 'flag') setMessage(current => ({ ...current, flagged: value }))
    return bulk(action, [message.uid], value)
  }

  const pages = Math.max(1, Math.ceil(list.total / list.pageSize))
  const allSelected = list.messages.length > 0 && selected.length === list.messages.length

  if (error && !folders.length) {
    return (
      <div className="ap-stack">
        <div className="ap-notice is-error">{error}</div>
        <div><button className="ap-btn ap-btn-ghost" onClick={onSettings}>Otwórz ustawienia poczty</button></div>
      </div>
    )
  }

  return (
    <div className={`ap-mailbox ${message ? 'has-message' : ''}`}>
      <aside className="ap-mail-folders">
        <button className="ap-btn ap-btn-primary" onClick={() => onCompose({})}><PenLine size={14} /> Napisz</button>
        <nav aria-label="Foldery">
          {folders.map(item => {
            const Icon = FOLDER_ICON[item.special] || Folder
            return (
              <button key={item.path} className={folder === item.path ? 'is-active' : ''} onClick={() => chooseFolder(item.path)}>
                <Icon size={15} /><span>{item.name}</span>
                {item.unseen > 0 && item.special !== '\\Trash' && <b className="ap-count">{item.unseen}</b>}
              </button>
            )
          })}
          <button className={folder === AUTOMATIC ? 'is-active' : ''} onClick={() => chooseFolder(AUTOMATIC)}>
            <History size={15} /><span>Historia wysyłek</span>
          </button>
        </nav>
      </aside>

      {folder === AUTOMATIC ? <AutomaticLog /> : (
        <>
          <section className="ap-mail-list" aria-label="Wiadomości">
            <form className="ap-mail-search" onSubmit={event => { event.preventDefault(); setPage(1); setAppliedSearch(search) }}>
              <Search size={14} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Szukaj w folderze" aria-label="Szukaj w folderze" />
            </form>

            <div className="ap-mail-bar">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : list.messages.map(item => item.uid))} aria-label="Zaznacz wszystkie" />
              {selected.length > 0 ? (
                <>
                  <button className="ap-icon-btn" onClick={() => bulk('seen', selected, true)} aria-label="Oznacz jako przeczytane"><MailOpen size={14} /></button>
                  <button className="ap-icon-btn" onClick={() => bulk('seen', selected, false)} aria-label="Oznacz jako nieprzeczytane"><Mail size={14} /></button>
                  <button className="ap-icon-btn is-danger" onClick={() => bulk('delete', selected)} aria-label="Usuń zaznaczone"><Trash2 size={14} /></button>
                  <span>{selected.length}</span>
                </>
              ) : (
                <div className="ap-mail-tabs">
                  {[['all', 'Wszystkie'], ['unread', 'Nieprzeczytane'], ['flagged', 'Z gwiazdką']].map(([id, label]) => (
                    <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => { setFilter(id); setPage(1) }}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="ap-notice is-error">{error}</div>}
            {!loading && !error && !list.messages.length && <Empty>{appliedSearch ? 'Nic nie znaleziono.' : 'Ten folder jest pusty.'}</Empty>}

            <ul className="ap-mail-rows">
              {list.messages.map(item => (
                <li key={item.uid} className={`${item.seen ? '' : 'is-unread'} ${message?.uid === item.uid ? 'is-open' : ''}`}>
                  <input type="checkbox" checked={selected.includes(item.uid)} onChange={() => setSelected(current => (current.includes(item.uid) ? current.filter(uid => uid !== item.uid) : [...current, item.uid]))} aria-label={`Zaznacz: ${item.subject}`} />
                  <button className={`ap-mail-star ${item.flagged ? 'is-on' : ''}`} onClick={() => bulk('flag', [item.uid], !item.flagged)} aria-pressed={item.flagged} aria-label="Gwiazdka"><Star size={13} /></button>
                  <button className="ap-mail-row" onClick={() => open(item)}>
                    <span>
                      <b>{item.to.length && folders.find(entry => entry.path === folder)?.special === '\\Sent' ? `Do: ${senderName(item.to[0])}` : senderName(item.from[0])}</b>
                      <time>{formatDate(item.date)}</time>
                    </span>
                    <span>
                      <i>{item.subject}</i>
                      {item.answered && <Reply size={12} aria-label="Odpowiedziano" />}
                      {item.attachment && <Paperclip size={12} aria-label="Załącznik" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {pages > 1 && (
              <div className="ap-mail-pages">
                <button className="ap-icon-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Poprzednia strona"><ChevronLeft size={14} /></button>
                <span>{page} / {pages}</span>
                <button className="ap-icon-btn" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Następna strona"><ChevronRight size={14} /></button>
              </div>
            )}
          </section>

          <section className="ap-mail-view">
            {message
              ? <Reader folder={folder} message={message} folders={folders} onBack={() => setMessage(null)} onCompose={onCompose} onAct={readerAct} />
              : <Empty>Wybierz wiadomość z listy.</Empty>}
          </section>
        </>
      )}
    </div>
  )
}
