import { useEffect, useState } from 'react'
import defaultContent from '../../server/content.default.json'

/**
 * Treści i rejestr realizacji przychodzą z panelu, ale dołączone wartości
 * domyślne trzymają stronę w całości przy pierwszym rysowaniu i wtedy, gdy API
 * jest nieosiągalne. Rejestr startuje pusty — realizacje dodaje się w panelu.
 */
export function useSiteData() {
  const [data, setData] = useState({ content: defaultContent, pages: [], projects: [], ready: false })

  useEffect(() => {
    let active = true
    fetch('/api/content')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then(payload => {
        if (!active) return
        setData({
          content: payload.content || defaultContent,
          pages: Array.isArray(payload.pages) ? payload.pages : [],
          projects: Array.isArray(payload.projects) ? payload.projects : [],
          ready: true,
        })
      })
      .catch(() => active && setData(current => ({ ...current, ready: true })))
    return () => { active = false }
  }, [])

  return data
}

export { defaultContent }
