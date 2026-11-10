import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Jeden szablon dla każdej wiadomości ze strony: powiadomień do właściciela,
 * potwierdzeń dla klientów i maili pisanych ręcznie w panelu. Logo jedzie
 * w samej wiadomości jako obraz CID – Gmail i Outlook blokują `data:`,
 * a zdalne obrazy często są wyłączone, więc tylko CID widać zawsze.
 */

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'email')
const SITE = 'https://redzikowski.com'
const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"

const C = {
  page: '#ece8e0',
  card: '#ffffff',
  line: '#e4ded2',
  head: '#0e0d0c',
  gold: '#c9a84c',
  kicker: '#9a7428',
  ink: '#1d1b18',
  text: '#3a362f',
  muted: '#7d766b',
  soft: '#f7f5f0',
}

export const LOGO_CID = 'wordmark@redzikowski.com'
export const MARK_CID = 'mark@redzikowski.com'

/** Obrazy osadzone – dołączane tylko wtedy, gdy HTML się do nich odwołuje. */
export function brandAttachments(html = '') {
  return [
    [LOGO_CID, 'wordmark.png', 'redzikowski-com.png'],
    [MARK_CID, 'mark.png', 'redzikowski-r.png'],
  ]
    .filter(([cid]) => html.includes(`cid:${cid}`))
    .map(([cid, file, filename]) => ({ cid, filename, path: path.join(ASSETS, file), contentType: 'image/png', contentDisposition: 'inline' }))
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const COPY = {
  pl: { role: 'Digital Studio', tagline: 'Strony internetowe, systemy webowe, AI i dane' },
  en: { role: 'Digital Studio', tagline: 'Websites, web systems, AI and data' },
}

/* ── klocki treści (wszystkie przyjmują zwykły tekst, chyba że nazwa mówi inaczej) ── */

export const kicker = text =>
  `<div style="font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${C.kicker}">${escapeHtml(text)}</div>`

export const heading = (text, size = 28) =>
  `<h1 style="margin:12px 0 20px;font-size:${size}px;line-height:1.2;font-weight:700;letter-spacing:-.4px;color:${C.ink}">${escapeHtml(text)}</h1>`

export const paragraphHtml = html =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${C.text}">${html}</p>`

export const paragraph = text => paragraphHtml(escapeHtml(text))

/** Tabela „etykieta – wartość”, np. dane nadawcy zapytania. */
export function details(rows) {
  const filled = rows.filter(([, value]) => value)
  if (!filled.length) return ''
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 22px;border-collapse:collapse">
    ${filled.map(([label, value], index) => `<tr>
      <td style="padding:9px 14px 9px 0;width:120px;vertical-align:top;font-size:12px;letter-spacing:.3px;color:${C.muted};${index ? `border-top:1px solid ${C.line};` : ''}">${escapeHtml(label)}</td>
      <td style="padding:9px 0;vertical-align:top;font-size:14px;line-height:1.5;color:${C.ink};${index ? `border-top:1px solid ${C.line};` : ''}">${value.html ?? escapeHtml(value)}</td>
    </tr>`).join('')}
  </table>`
}

export const link = (href, text) =>
  ({ html: `<a href="${escapeHtml(href)}" style="color:${C.kicker};text-decoration:underline">${escapeHtml(text)}</a>` })

/** Treść wiadomości od klienta albo raportu – zachowuje podziały wierszy. */
export const messageBox = (text, { small = false } = {}) =>
  `<div style="margin:6px 0 0;padding:20px 22px;background:${C.soft};border:1px solid ${C.line};border-radius:12px;font-size:${small ? 13 : 15}px;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:${C.ink}">${escapeHtml(text)}</div>`

export const button = (href, text) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 4px"><tr>
    <td bgcolor="${C.gold}" style="border-radius:10px">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:700;color:#14120f;text-decoration:none;border-radius:10px">${escapeHtml(text)}</a>
    </td>
  </tr></table>`

export const signature = () =>
  `<p style="margin:30px 0 0;font-size:15px;line-height:1.55;color:${C.ink}">Adam Rędzikowski<br><span style="font-size:13px;color:${C.muted}">Digital Studio · redzikowski.com</span></p>`

/**
 * Rama wiadomości. `content` to gotowy HTML z klocków powyżej albo treść
 * z edytora panelu (ta trafia do kontenera z atrybutem data-ar-body, po
 * którym panel rozpoznaje własną treść przy cytowaniu).
 */
export function emailFrame(content, { lang = 'pl', preheader = '', contact = '' } = {}) {
  const copy = COPY[lang] || COPY.pl
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
  .ar-body p { margin: 0 0 14px; }
  .ar-body a { color: ${C.kicker}; }
  .ar-body blockquote { margin: 14px 0; padding: 12px 16px; background: ${C.soft}; border: 1px solid ${C.line}; border-radius: 10px; color: ${C.muted}; }
  .ar-body ul, .ar-body ol { margin: 0 0 14px; padding-left: 22px; }
  @media (max-width: 620px) {
    .ar-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .ar-main { padding-top: 30px !important; padding-bottom: 30px !important; }
    .ar-role { display: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${C.page}" style="background:${C.page}">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;font-family:${FONT}">
      <tr><td class="ar-pad" bgcolor="${C.head}" style="padding:26px 34px;background:${C.head}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td valign="middle"><a href="${SITE}" style="text-decoration:none"><img src="cid:${LOGO_CID}" width="200" height="26" alt="rędzikowski.com" style="display:block;border:0;width:200px;height:auto;color:${C.gold};font-size:20px;font-weight:700"></a></td>
          <td class="ar-role" align="right" valign="middle" style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#8d8579;white-space:nowrap">${copy.role}</td>
        </tr></table>
      </td></tr>
      <tr><td height="3" bgcolor="${C.gold}" style="height:3px;line-height:3px;font-size:0;background:${C.gold}">&nbsp;</td></tr>
      <tr><td class="ar-pad ar-main" style="padding:40px 34px 38px;color:${C.text};font-size:15px;line-height:1.65">${content}</td></tr>
      <tr><td class="ar-pad" bgcolor="${C.soft}" style="padding:22px 34px;background:${C.soft};border-top:1px solid ${C.line}">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td valign="middle" style="padding-right:14px"><img src="cid:${MARK_CID}" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;border-radius:9px;background:${C.head}"></td>
          <td valign="middle" style="font-size:12px;line-height:1.55;color:${C.muted}">
            <b style="color:${C.ink}">Adam Rędzikowski</b> · ${copy.role}<br>
            <a href="${SITE}" style="color:${C.kicker};text-decoration:none">redzikowski.com</a>${contact ? ` · <a href="mailto:${escapeHtml(contact)}" style="color:${C.kicker};text-decoration:none">${escapeHtml(contact)}</a>` : ''}<br>
            ${copy.tagline}
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

/** Treść z edytora panelu w tej samej ramie co wiadomości automatyczne. */
export function wrapComposed(html, options) {
  return emailFrame(`<div class="ar-body" data-ar-body="1" style="font-size:15px;line-height:1.65;color:${C.text}">${html}</div>`, options)
}

export function textFooter(lang = 'pl') {
  return `\n\n--\nAdam Rędzikowski · ${COPY[lang]?.role || COPY.pl.role}\nredzikowski.com`
}
