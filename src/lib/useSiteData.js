import { useEffect, useState } from 'react'
import defaultContent from '../../server/content.default.json'

/**
 * Content lives in the admin panel, but the bundled defaults keep the site
 * complete on first paint and whenever the API is unreachable.
 */
export function useSiteData() {
  const [data, setData] = useState({ content: defaultContent, pages: [], ready: false })

  useEffect(() => {
    let active = true
    fetch('/api/content')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then(payload => {
        if (!active) return
        setData({
          content: payload.content || defaultContent,
          pages: Array.isArray(payload.pages) ? payload.pages : [],
          ready: true,
        })
      })
      .catch(() => active && setData(current => ({ ...current, ready: true })))
    return () => { active = false }
  }, [])

  return data
}

export { defaultContent }
