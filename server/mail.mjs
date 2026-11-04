import crypto from 'node:crypto'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import MailComposer from 'nodemailer/lib/mail-composer/index.js'
import addressparser from 'nodemailer/lib/addressparser/index.js'

/**
 * Skrzynka firmowa w panelu: IMAP to jedyne źródło prawdy, serwer niczego nie
 * przechowuje. Każde żądanie otwiera własne połączenie – panel obsługuje jedna
 * osoba, więc prostota wygrywa z pulą połączeń.
 */

const PAGE_SIZE = 30
const MAX_ATTACHMENTS_BYTES = 8 * 1024 * 1024

const SPECIAL_NAME = {
  '\\Inbox': 'Odebrane', '\\Sent': 'Wysłane', '\\Drafts': 'Szkice',
  '\\Junk': 'Spam', '\\Trash': 'Kosz', '\\Archive': 'Archiwum',
}
const SPECIAL_ORDER = ['\\Inbox', '\\Drafts', '\\Sent', '\\Archive', '\\Junk', '\\Trash']
// Serwery bez SPECIAL-USE: rozpoznanie po nazwie ostatniego członu ścieżki.
const SPECIAL_GUESS = [
  ['\\Sent', /^(sent|sent items|sent messages|wysłane|wyslane)$/i],
  ['\\Drafts', /^(drafts?|szkice|robocze)$/i],
  ['\\Trash', /^(trash|deleted|deleted items|deleted messages|kosz)$/i],
  ['\\Junk', /^(junk|spam)$/i],
  ['\\Archive', /^(archive|archiwum)$/i],
]

class MailError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function explainFailure(error) {
  if (error.authenticationFailed) return 'Serwer odrzucił login lub hasło. Sprawdź dane w ustawieniach poczty.'
  if (['ETIMEDOUT', 'ETIMEOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH'].includes(error.code)) {
    return `Serwer poczty nie odpowiada (${error.code}). Sprawdź adres i port w ustawieniach poczty.`
  }
  return `Nie udało się połączyć ze skrzynką: ${String(error.responseText || error.message).slice(0, 250)}`
}

const specialOf = box => {
  if (box.path.toUpperCase() === 'INBOX') return '\\Inbox'
  if (box.specialUse && SPECIAL_NAME[box.specialUse]) return box.specialUse
  return SPECIAL_GUESS.find(([, pattern]) => pattern.test(box.name))?.[0] || ''
}

const person = entry => ({ name: entry?.name || '', address: entry?.address || '' })
const people = list => (list || []).map(person)
const parsedPeople = field => (Array.isArray(field) ? field : field ? [field] : []).flatMap(item => item.value || []).map(person)

function hasAttachment(node) {
  if (!node) return false
  if (node.disposition === 'attachment') return true
  return (node.childNodes || []).some(hasAttachment)
}

const summary = message => ({
  uid: message.uid,
  subject: message.envelope?.subject || '(bez tematu)',
  from: people(message.envelope?.from),
  to: people(message.envelope?.to),
  date: (message.envelope?.date || message.internalDate)?.toISOString?.() || null,
  size: message.size || 0,
  seen: message.flags?.has('\\Seen') || false,
  flagged: message.flags?.has('\\Flagged') || false,
  answered: message.flags?.has('\\Answered') || false,
  draft: message.flags?.has('\\Draft') || false,
  attachment: hasAttachment(message.bodyStructure),
})

function uidList(value) {
  const uids = (Array.isArray(value) ? value : [value]).map(Number).filter(uid => Number.isInteger(uid) && uid > 0)
  if (!uids.length) throw new MailError('Nie wskazano wiadomości.')
  return uids.slice(0, 500)
}

function folderName(value) {
  const folder = String(value ?? '').slice(0, 300)
  if (!folder) throw new MailError('Nie wskazano folderu.')
  return folder
}

function recipients(value) {
  return addressparser(String(value || '').slice(0, 4000), { flatten: true }).filter(entry => entry.address)
}

export function createMail({ getSettings, getTransport, enforceSameOrigin, appendOutbox, onSubmissionReply, cleanText }) {
  const connect = async () => {
    const settings = await getSettings({ includePassword: true })
    if (!settings.imapHost || !settings.imapUsername || !settings.password) {
      throw new MailError('Najpierw uzupełnij ustawienia poczty.', 409)
    }
    const client = new ImapFlow({
      host: settings.imapHost,
      port: settings.imapPort,
      secure: settings.imapSecure,
      auth: { user: settings.imapUsername, pass: settings.password },
      logger: false,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })
    // Bez nasłuchu zerwane połączenie wywróciłoby cały proces API.
    client.on('error', error => console.error('IMAP:', error.message))
    await client.connect()
    return { client, settings }
  }

  const withClient = async action => {
    const { client, settings } = await connect()
    try {
      return await action(client, settings)
    } finally {
      await client.logout().catch(() => client.close())
    }
  }

  const withFolder = (folder, action, options) => withClient(async (client, settings) => {
    const lock = await client.getMailboxLock(folder, options)
    try {
      return await action(client, settings)
    } finally {
      lock.release()
    }
  })

  const findSpecial = async (client, special) => (await client.list())
    .find(box => specialOf(box) === special)?.path

  /* Licznik do dzwonka: co pięć minut albo po zmianie w skrzynce. */
  let unseenCache = { count: 0, at: 0 }
  const forgetUnseen = () => { unseenCache = { ...unseenCache, at: 0 } }

  async function countUnseen() {
    if (Date.now() - unseenCache.at < 5 * 60 * 1000) return unseenCache.count
    let count = 0
    try {
      count = await withClient(async client => (await client.status('INBOX', { unseen: true })).unseen || 0)
    } catch (error) {
      if (error.status !== 409) console.error('Unseen count failed:', error.message)
    }
    unseenCache = { count, at: Date.now() }
    return count
  }

  const handle = action => async (req, res) => {
    try {
      res.json(await action(req, res))
    } catch (error) {
      if (error instanceof MailError) return res.status(error.status).json({ error: error.message })
      res.status(502).json({ error: explainFailure(error) })
    }
  }

  function buildRaw(settings, body, { draft = false } = {}) {
    const to = recipients(body.to)
    const cc = recipients(body.cc)
    const bcc = recipients(body.bcc)
    if (!draft && !to.length && !cc.length && !bcc.length) throw new MailError('Podaj co najmniej jednego odbiorcę.')

    const attachments = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, 20).map(file => ({
      filename: cleanText(file?.name, 200) || 'zalacznik',
      contentType: cleanText(file?.type, 120) || 'application/octet-stream',
      content: Buffer.from(String(file?.data || ''), 'base64'),
    }))
    if (attachments.reduce((sum, file) => sum + file.content.length, 0) > MAX_ATTACHMENTS_BYTES) {
      throw new MailError('Załączniki mogą mieć razem najwyżej 8 MB.')
    }

    const domain = settings.smtpUsername.split('@')[1] || 'localhost'
    const composer = new MailComposer({
      from: { name: settings.fromName, address: settings.smtpUsername },
      to, cc,
      subject: cleanText(body.subject, 500),
      html: String(body.html || '').slice(0, 2_000_000),
      text: String(body.text || '').slice(0, 1_000_000),
      inReplyTo: cleanText(body.inReplyTo, 500) || undefined,
      references: cleanText(body.references, 4000) || undefined,
      messageId: `<${crypto.randomUUID()}@${domain}>`,
      date: new Date(),
      attachments,
    })
    return new Promise((resolve, reject) => {
      composer.compile().build((error, raw) => (error ? reject(error) : resolve({
        raw,
        to, cc, bcc,
        subject: cleanText(body.subject, 500),
        from: settings.smtpUsername,
      })))
    })
  }

  function mount(app) {
    app.get('/api/admin/mail/folders', handle(() => withClient(async (client, settings) => {
      const boxes = await client.list({ statusQuery: { messages: true, unseen: true } })
      const folders = boxes
        .filter(box => !box.flags?.has('\\Noselect'))
        .map(box => {
          const special = specialOf(box)
          return {
            path: box.path,
            name: SPECIAL_NAME[special] || box.name,
            special,
            total: box.status?.messages || 0,
            unseen: box.status?.unseen || 0,
          }
        })
        .sort((a, b) => {
          const rank = folder => (folder.special ? SPECIAL_ORDER.indexOf(folder.special) : SPECIAL_ORDER.length)
          return rank(a) - rank(b) || a.name.localeCompare(b.name, 'pl')
        })
      return { folders, identity: { name: settings.fromName, address: settings.smtpUsername } }
    })))

    app.get('/api/admin/mail/messages', handle(req => {
      const folder = folderName(req.query.folder)
      const page = Math.max(1, Number(req.query.page) || 1)
      const q = cleanText(req.query.q, 200)
      return withFolder(folder, async client => {
        const query = q
          ? { or: [{ subject: q }, { from: q }, { to: q }, { body: q }] }
          : { all: true }
        if (req.query.filter === 'unread') query.seen = false
        if (req.query.filter === 'flagged') query.flagged = true
        const found = (await client.search(query, { uid: true })) || []
        const uids = [...found].sort((a, b) => b - a)
        const slice = uids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        const messages = []
        if (slice.length) {
          for await (const message of client.fetch(slice.join(','), { envelope: true, flags: true, bodyStructure: true, internalDate: true, size: true, uid: true }, { uid: true })) {
            messages.push(summary(message))
          }
        }
        messages.sort((a, b) => b.uid - a.uid)
        return { messages, total: uids.length, page, pageSize: PAGE_SIZE }
      }, { readOnly: true })
    }))

    app.get('/api/admin/mail/message', handle(req => {
      const folder = folderName(req.query.folder)
      const [uid] = uidList(req.query.uid)
      return withFolder(folder, async client => {
        const message = await client.fetchOne(String(uid), { source: true, flags: true }, { uid: true })
        if (!message) throw new MailError('Wiadomość już nie istnieje.', 404)
        const parsed = await simpleParser(message.source)
        if (!message.flags?.has('\\Seen')) {
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
          forgetUnseen()
        }
        return {
          uid,
          subject: parsed.subject || '(bez tematu)',
          from: parsedPeople(parsed.from),
          to: parsedPeople(parsed.to),
          cc: parsedPeople(parsed.cc),
          replyTo: parsedPeople(parsed.replyTo),
          date: parsed.date?.toISOString() || null,
          messageId: parsed.messageId || '',
          references: [parsed.references].flat().filter(Boolean).join(' '),
          // Obrazy osadzone mailparser zamienia na data: – reszta to załączniki.
          html: parsed.html || '',
          text: parsed.text || '',
          flagged: message.flags?.has('\\Flagged') || false,
          draft: message.flags?.has('\\Draft') || false,
          attachments: parsed.attachments
            .map((file, index) => ({ index, name: file.filename || `zalacznik-${index + 1}`, type: file.contentType, size: file.size, related: file.related }))
            .filter(file => !file.related),
        }
      })
    }))

    // Załącznik zawsze jako plik do pobrania – nigdy nie renderuje się w domenie panelu.
    app.get('/api/admin/mail/attachment', async (req, res) => {
      try {
        const folder = folderName(req.query.folder)
        const [uid] = uidList(req.query.uid)
        const file = await withFolder(folder, async client => {
          const message = await client.fetchOne(String(uid), { source: true }, { uid: true })
          if (!message) throw new MailError('Wiadomość już nie istnieje.', 404)
          return (await simpleParser(message.source)).attachments[Number(req.query.index)]
        }, { readOnly: true })
        if (!file) throw new MailError('Nie ma takiego załącznika.', 404)
        res.set({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename || 'zalacznik')}`,
          'X-Content-Type-Options': 'nosniff',
        })
        res.send(file.content)
      } catch (error) {
        const status = error instanceof MailError ? error.status : 502
        res.status(status).json({ error: error instanceof MailError ? error.message : explainFailure(error) })
      }
    })

    app.post('/api/admin/mail/flags', enforceSameOrigin, handle(req => {
      const folder = folderName(req.body.folder)
      const range = uidList(req.body.uids).join(',')
      return withFolder(folder, async client => {
        const change = async (flag, on) => {
          if (typeof on !== 'boolean') return
          await (on ? client.messageFlagsAdd(range, [flag], { uid: true }) : client.messageFlagsRemove(range, [flag], { uid: true }))
        }
        await change('\\Seen', req.body.seen)
        await change('\\Flagged', req.body.flagged)
        forgetUnseen()
        return { ok: true }
      })
    }))

    app.post('/api/admin/mail/move', enforceSameOrigin, handle(req => {
      const folder = folderName(req.body.folder)
      const range = uidList(req.body.uids).join(',')
      const target = folderName(req.body.target)
      return withFolder(folder, async client => {
        await client.messageMove(range, target, { uid: true })
        forgetUnseen()
        return { ok: true }
      })
    }))

    // Pierwsze usunięcie przenosi do kosza; dopiero z kosza kasuje na stałe.
    app.post('/api/admin/mail/delete', enforceSameOrigin, handle(req => {
      const folder = folderName(req.body.folder)
      const range = uidList(req.body.uids).join(',')
      return withFolder(folder, async client => {
        const trash = await findSpecial(client, '\\Trash')
        if (trash && trash !== folder) {
          await client.messageMove(range, trash, { uid: true })
        } else {
          await client.messageDelete(range, { uid: true })
        }
        forgetUnseen()
        return { ok: true, permanent: !trash || trash === folder }
      })
    }))

    app.post('/api/admin/mail/draft', enforceSameOrigin, handle(req => withClient(async (client, settings) => {
      const built = await buildRaw(settings, req.body, { draft: true })
      let drafts = await findSpecial(client, '\\Drafts')
      if (!drafts) {
        drafts = 'Drafts'
        await client.mailboxCreate(drafts).catch(() => undefined)
      }
      const saved = await client.append(drafts, built.raw, ['\\Draft', '\\Seen'])
      const previous = Number(req.body.draftUid)
      if (previous > 0) {
        const lock = await client.getMailboxLock(drafts)
        try {
          await client.messageDelete(String(previous), { uid: true })
        } finally {
          lock.release()
        }
      }
      return { ok: true, uid: saved?.uid || 0 }
    })))

    app.post('/api/admin/mail/send', enforceSameOrigin, handle(async req => {
      const settings = await getSettings({ includePassword: true })
      const transport = getTransport(settings)
      if (!transport) throw new MailError('Najpierw uzupełnij ustawienia SMTP.', 409)
      const built = await buildRaw(settings, req.body)
      const envelope = { from: built.from, to: [...built.to, ...built.cc, ...built.bcc].map(entry => entry.address) }

      const log = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        kind: 'manual',
        submissionId: cleanText(req.body.submissionId, 80) || undefined,
        to: envelope.to.join(', '),
        subject: built.subject,
      }
      try {
        await transport.sendMail({ envelope, raw: built.raw })
      } catch (error) {
        await appendOutbox({ ...log, status: 'failed', error: cleanText(error.message, 500) })
        throw new MailError(`Serwer SMTP nie przyjął wiadomości: ${cleanText(error.message, 250)}`, 502)
      }
      await appendOutbox({ ...log, status: 'sent' })

      // Wiadomość już poszła – kłopot z kopią nie może wyglądać jak błąd wysyłki.
      let warning = ''
      try {
        await withClient(async client => {
          let sent = await findSpecial(client, '\\Sent')
          if (!sent) {
            sent = 'Sent'
            await client.mailboxCreate(sent).catch(() => undefined)
          }
          await client.append(sent, built.raw, ['\\Seen'])

          const original = req.body.original
          if (original?.folder && Number(original.uid) > 0) {
            const lock = await client.getMailboxLock(folderName(original.folder))
            try {
              await client.messageFlagsAdd(String(Number(original.uid)), ['\\Answered'], { uid: true })
            } finally {
              lock.release()
            }
          }
          const draftUid = Number(req.body.draftUid)
          const drafts = draftUid > 0 && await findSpecial(client, '\\Drafts')
          if (drafts) {
            const lock = await client.getMailboxLock(drafts)
            try {
              await client.messageDelete(String(draftUid), { uid: true })
            } finally {
              lock.release()
            }
          }
        })
      } catch (error) {
        console.error('Saving sent copy failed:', error.message)
        warning = 'Wiadomość wysłana, ale nie udało się zapisać jej kopii w folderze Wysłane.'
      }

      if (log.submissionId) {
        await onSubmissionReply(log.submissionId, { at: log.createdAt, to: log.to, subject: log.subject })
      }
      return { ok: true, warning }
    }))
  }

  return { mount, countUnseen }
}
