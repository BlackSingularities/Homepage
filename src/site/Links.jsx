import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Search, Star, X } from 'lucide-react'
import { useT } from '../lib/i18n'
import { applySeo } from '../lib/seo'
import SectionHead from './SectionHead'
import '../styles/links.css'

/** Przejście liczy serwer; sendBeacon nie blokuje otwarcia karty. */
function countVisit(id) {
  const url = `/api/links/${encodeURIComponent(id)}/visit`
  try {
    if (navigator.sendBeacon?.(url)) return
  } catch { /* przeglądarka bez beaconów */ }
  fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
}

function Favicon({ item, large }) {
  const [broken, setBroken] = useState(false)
  const letter = (item.title || item.domain || '?').trim().charAt(0).toUpperCase()
  return (
    <span className={`link-icon ${large ? 'is-large' : ''}`} aria-hidden="true">
      {item.icon && !broken ? <img src={item.icon} alt="" loading="lazy" onError={() => setBroken(true)} /> : <b>{letter}</b>}
    </span>
  )
}

/** Miniatura: zrzut strony zrobiony przez serwer; bez niego – favicon na tle. */
function Shot({ item }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="link-shot" aria-hidden="true">
      {item.shot && !broken
        ? <img src={item.shot} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
        : <span className="link-shot-empty"><Favicon item={item} large /></span>}
    </div>
  )
}

function LinkCard({ item, featured }) {
  const { t } = useT()
  return (
    <article className={`link-card ${featured ? 'is-featured' : ''}`}>
      <a
        className="link-card-hit"
        href={item.url}
        target="_blank"
        rel="noopener"
        onClick={() => countVisit(item.id)}
        onAuxClick={event => event.button === 1 && countVisit(item.id)}
        aria-label={`${item.title} – ${t('links.opens', item.domain)}`}
      />
      <Shot item={item} />
      <div className="link-card-body">
        <header className="link-card-head">
          <Favicon item={item} />
          <div className="link-card-title">
            <h3>{item.title}</h3>
            <span className="mono">{item.domain}</span>
          </div>
          <ArrowUpRight className="link-card-go" size={18} aria-hidden="true" />
        </header>
        {item.description && <p className="link-card-desc">{item.description}</p>}
      </div>
    </article>
  )
}

export default function Links() {
  const { t, lang } = useT()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    let active = true
    fetch('/api/links')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then(payload => active && setData(payload))
      .catch(() => active && setError(true))
    return () => { active = false }
  }, [])

  useEffect(() => {
    applySeo({ lang, path: '/przydatne-linki', title: t('seo.linksTitle'), description: t('seo.linksDescription') })
  }, [lang, t])

  // „/” przenosi do wyszukiwarki, Esc ją czyści.
  useEffect(() => {
    const onKey = event => {
      const typing = /^(input|textarea|select)$/i.test(event.target.tagName) || event.target.isContentEditable
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape' && event.target === searchRef.current) setQuery('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items = data?.items || []
  const categories = data?.categories || []
  const nameOf = id => categories.find(entry => entry.id === id)?.name || ''

  const raw = query.trim().toLocaleLowerCase('pl')
  // „#tag” szuka dokładnie tego tagu; zwykły tekst – wszędzie.
  const tagOnly = raw.startsWith('#') && raw.length > 1
  const needle = raw.replace(/^#/, '')
  const filtering = Boolean(needle || category)

  const matches = useMemo(() => items.filter(item => (!category || item.category === category)
    && (!needle || (tagOnly
      ? (item.tags || []).includes(needle)
      : [item.title, item.domain, item.description, nameOf(item.category), ...(item.tags || [])]
        .join(' ').toLocaleLowerCase('pl').includes(needle)))), [items, category, needle, tagOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  const featured = filtering ? [] : items.filter(item => item.featured)
  const groups = categories
    .filter(entry => !category || entry.id === category)
    .map(entry => ({ ...entry, entries: matches.filter(item => item.category === entry.id) }))
    .filter(group => group.entries.length)

  return (
    <main className="catalog links-page">
      <section className="section">
        <SectionHead
          level="h1"
          title={t('links.title')}
          accent={t('links.accent')}
          lead={t('links.lead')}
          count={data ? t('links.count', items.length) : undefined}
        />

        {!data && (
          <p className="links-state" role="status">{error ? t('links.error') : t('links.loading')}</p>
        )}

        {data && !items.length && <p className="links-state">{t('links.none')}</p>}

        {data && items.length > 0 && (
          <>
            <div className="links-tools">
              <label className="links-search">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">{t('links.search')}</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={t('links.searchPlaceholder')}
                />
                {query
                  ? <button type="button" onClick={() => setQuery('')} aria-label={t('links.clear')}><X size={15} /></button>
                  : <kbd aria-hidden="true">/</kbd>}
              </label>
              {categories.length > 1 && (
                <div className="catalog-filters" role="group" aria-label={t('links.categories')}>
                  <button type="button" className={`chip ${!category ? 'is-active' : ''}`} aria-pressed={!category} onClick={() => setCategory('')}>
                    {t('links.all')} <i>{items.length}</i>
                  </button>
                  {categories.map(entry => (
                    <button
                      key={entry.id}
                      type="button"
                      className={`chip ${category === entry.id ? 'is-active' : ''}`}
                      aria-pressed={category === entry.id}
                      onClick={() => setCategory(current => (current === entry.id ? '' : entry.id))}
                    >
                      {entry.name} <i>{items.filter(item => item.category === entry.id).length}</i>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filtering && <p className="links-results mono" aria-live="polite">{t('links.results', matches.length)}</p>}

            {featured.length > 0 && (
              <section className="links-group links-featured" aria-labelledby="links-featured">
                <h2 id="links-featured" className="links-group-title"><Star size={16} /> {t('links.featured')}</h2>
                <div className="links-grid">
                  {featured.map(item => <LinkCard key={item.id} item={item} featured />)}
                </div>
              </section>
            )}

            {groups.map(group => (
              <section className="links-group" key={group.id} aria-labelledby={`links-${group.id}`}>
                <header className="links-group-head">
                  <h2 id={`links-${group.id}`} className="links-group-title">{group.name}</h2>
                  <span className="mono">{String(group.entries.length).padStart(2, '0')}</span>
                  {group.description && <p>{group.description}</p>}
                </header>
                <div className="links-grid">
                  {group.entries.map(item => <LinkCard key={item.id} item={item} />)}
                </div>
              </section>
            ))}

            {filtering && !matches.length && (
              <div className="links-empty">
                <p>{t('links.empty')}</p>
                <button type="button" className="btn btn-ghost" onClick={() => { setQuery(''); setCategory('') }}>{t('links.clear')}</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
