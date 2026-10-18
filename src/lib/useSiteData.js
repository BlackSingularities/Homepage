import { useEffect, useState } from 'react'
import defaultContentPl from '../../server/content.default.json'
import defaultContentEn from '../../server/content.default.en.json'

const DEFAULTS = { pl: defaultContentPl, en: defaultContentEn }

/**
 * Treści i portfolio przychodzą z panelu, ale dołączone wartości
 * domyślne trzymają stronę w całości przy pierwszym rysowaniu i wtedy, gdy API
 * jest nieosiągalne. Przy zmianie języka dane pobierają się od nowa.
 */
export function useSiteData(lang = 'pl') {
  const fallback = DEFAULTS[lang] || defaultContentPl
  const [data, setData] = useState({ lang, content: fallback, pages: [], projects: [], ready: false })

  useEffect(() => {
    let active = true
    setData(current => (current.lang === lang ? current : { ...current, lang, content: fallback }))
    fetch(`/api/content?lang=${lang}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then(payload => {
        if (!active) return
        setData({
          lang,
          content: payload.content || fallback,
          pages: Array.isArray(payload.pages) ? payload.pages : [],
          projects: Array.isArray(payload.projects) ? payload.projects : [],
          ready: true,
        })
      })
      .catch(() => active && setData(current => ({ ...current, ready: true })))
    return () => { active = false }
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  return data
}

export const defaultContent = defaultContentPl
