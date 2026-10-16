export async function api(path, options = {}) {
  const response = await fetch(path, options)
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401 && path.startsWith('/api/admin/')) {
    window.dispatchEvent(new CustomEvent('admin:unauthorized'))
  }
  if (!response.ok) throw new Error(payload.error || 'Nie udało się wykonać operacji.')
  return payload
}

export function json(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

const MAX_UPLOAD = 10 * 1024 * 1024

/** Images travel as a raw body – no multipart parser needed on the server. */
export async function uploadImage(file) {
  if (!file) throw new Error('Nie wybrano pliku.')
  if (file.size > MAX_UPLOAD) throw new Error('Maksymalny rozmiar pliku to 10 MB.')
  return api('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name).slice(0, 120) },
    body: file,
  })
}

/** crypto.randomUUID is unavailable on insecure origins – keep a fallback. */
export const uid = () => (globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export const formatDate = value => (value
  ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '–')

export const formatDay = value => (value
  ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(new Date(value))
  : '–')

export const formatSize = bytes => `${(bytes / 1024 / 1024).toFixed(bytes > 512 * 1024 ? 1 : 2)} MB`
