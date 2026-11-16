import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowUp, ArrowUpRight, Eye, EyeOff, Globe, Link2, ListPlus, LoaderCircle, MousePointerClick, Plus, Search,
  Camera, Sparkles, Star, Trash2, Wand2, X,
} from 'lucide-react'
import { api, formatDay, json, uid } from '../lib/api'
import { Card, Empty, Field, ImagePicker, SaveBar, Toggle, toast } from './parts'

/** Adres w takiej postaci, w jakiej zapisze go serwer – do porównań i podglądu. */
export function normalizeUrl(value) {
  let raw = String(value || '').trim()
  if (!raw) return ''
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw.replace(/^\/+/, '')}`
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return ''
    return url.toString()
  } catch {
    return ''
  }
}

const domainOf = url => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/** Klucz porównania: bez protokołu, „www.” i końcowego ukośnika. */
const sameKey = url => normalizeUrl(url).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').toLowerCase()

export function LinkIcon({ item, size = 30 }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [item.icon])
  const letter = (item.title || domainOf(item.url) || '?').trim().charAt(0).toUpperCase()
  return (
    <span className="ap-link-icon" style={{ width: size, height: size }}>
      {item.icon && !broken ? <img src={item.icon} alt="" onError={() => setBroken(true)} /> : <b>{letter}</b>}
    </span>
  )
}

function newLink(url, category) {
  const now = new Date().toISOString()
  return {
    id: uid(), url, title: domainOf(url), description: '', category, tags: [], icon: '',
    featured: false, published: true, clicks: 0, createdAt: now, updatedAt: now,
  }
}

async function inspect(url) {
  return api('/api/admin/links/inspect', json('POST', { url }))
}

export default function LinksManager({ item: routeItem = '', onItem }) {
  const [data, setData] = useState(null)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState(routeItem)
  const [quick, setQuick] = useState('')
  const [adding, setAdding] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulk, setBulk] = useState('')
  const [bulkProgress, setBulkProgress] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [shotting, setShotting] = useState(false)
  const quickRef = useRef(null)

  const dirty = data !== null && JSON.stringify(data) !== saved

  const load = useCallback(async () => {
    try {
      const payload = await api('/api/admin/links')
      setData(payload)
      setSaved(JSON.stringify(payload))
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelected(routeItem) }, [routeItem])

  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const select = id => { setSelected(id); onItem?.(id) }

  const save = useCallback(async () => {
    if (!data) return
    setSaving(true)
    try {
      const payload = await api('/api/admin/links', json('PUT', data))
      setData(payload)
      setSaved(JSON.stringify(payload))
      toast.success('Linki zapisane i opublikowane.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }, [data])

  useEffect(() => {
    const onKey = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && dirty) {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, save])

  const items = data?.items || []
  const categories = data?.categories || []
  const item = items.find(entry => entry.id === selected)
  const categoryName = id => categories.find(category => category.id === id)?.name || '—'

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pl')
    return items.filter(entry => (!filter || entry.category === filter)
      && (!needle || `${entry.title} ${entry.url} ${entry.description} ${(entry.tags || []).join(' ')}`.toLocaleLowerCase('pl').includes(needle)))
  }, [items, query, filter])

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter(entry => entry.published).length,
    featured: items.filter(entry => entry.featured && entry.published).length,
    clicks: items.reduce((sum, entry) => sum + (entry.clicks || 0), 0),
  }), [items])

  const setItems = next => setData(current => ({ ...current, items: typeof next === 'function' ? next(current.items) : next }))
  const update = patch => setItems(list => list.map(entry => (entry.id === selected ? { ...entry, ...patch } : entry)))

  const duplicateOf = (url, selfId) => items.find(entry => entry.id !== selfId && sameKey(entry.url) === sameKey(url))

  /* ── dodawanie ── */

  const addOne = async (raw, { quiet = false, collect = false } = {}) => {
    const url = normalizeUrl(raw)
    if (!url) {
      if (!quiet) toast.error('To nie wygląda na adres strony.')
      return { status: 'invalid' }
    }
    const existing = duplicateOf(url)
    if (existing) {
      if (!quiet) { toast.info(`Ten link już jest na liście: „${existing.title}”.`); select(existing.id) }
      return { status: 'duplicate' }
    }
    const category = filter || categories[0]?.id
    const entry = newLink(url, category)
    try {
      const meta = await inspect(url)
      Object.assign(entry, {
        url: meta.url || url,
        title: meta.title || entry.title,
        description: meta.description || '',
        icon: meta.icon || '',
      })
    } catch (requestError) {
      if (!quiet) toast.error(`Nie udało się pobrać danych ze strony: ${requestError.message} Uzupełnij je ręcznie.`)
    }
    if (!collect) setItems(list => [entry, ...list])
    return { status: 'added', entry }
  }

  const quickAdd = async event => {
    event.preventDefault()
    if (!quick.trim() || adding) return
    if (!categories.length) return toast.error('Najpierw dodaj kategorię.')
    setAdding(true)
    const result = await addOne(quick)
    setAdding(false)
    if (result.status === 'added') {
      setQuick('')
      select(result.entry.id)
      toast.success(`Dodano „${result.entry.title}”. Sprawdź opis i zapisz zmiany.`)
    }
  }

  const bulkAdd = async () => {
    // Ten sam adres zapisany na dwa sposoby (z „www.”, bez protokołu) liczy się raz.
    const seen = new Set()
    const urls = bulk.split(/[\s,;]+/).map(entry => entry.trim()).filter(entry => {
      const key = sameKey(entry) || entry
      if (!entry || seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (!urls.length) return
    if (!categories.length) return toast.error('Najpierw dodaj kategorię.')
    const summary = { added: 0, duplicate: 0, invalid: 0 }
    const added = []
    for (const [index, url] of urls.entries()) {
      setBulkProgress({ done: index, total: urls.length })
      const { status, entry } = await addOne(url, { quiet: true, collect: true })
      summary[status] += 1
      if (entry) added.push(entry)
    }
    // Cała paczka trafia na górę listy w kolejności, w jakiej ją wklejono.
    if (added.length) setItems(list => [...added, ...list])
    setBulkProgress(null)
    setBulk('')
    setBulkOpen(false)
    toast.success(`Dodano ${summary.added}. Pominięto: ${summary.duplicate} powtórzonych, ${summary.invalid} niepoprawnych. Pamiętaj o zapisie.`)
  }

  /* ── edycja ── */

  const refetch = async () => {
    if (!item) return
    const url = normalizeUrl(item.url)
    if (!url) return toast.error('Popraw adres, zanim pobierzesz dane.')
    setFetching(true)
    try {
      const meta = await inspect(url)
      update({ url: meta.url || url, title: meta.title || item.title, description: meta.description || item.description, icon: meta.icon || item.icon })
      toast.success(meta.icon ? 'Pobrano tytuł, opis i favicon strony.' : 'Pobrano tytuł i opis. Strona nie udostępnia czytelnego faviconu.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setFetching(false)
    }
  }

  // Zrzut zapisuje serwer od razu – aktualizujemy też kopię „zapisanego” stanu, żeby nie udawać zmian.
  const reshoot = async () => {
    if (!item) return
    setShotting(true)
    const id = item.id
    try {
      const { shot, shotAt } = await api(`/api/admin/links/${encodeURIComponent(id)}/shot`, json('POST', {}))
      const patch = list => list.map(entry => (entry.id === id ? { ...entry, shot, shotAt } : entry))
      setItems(patch)
      setSaved(current => {
        const parsed = JSON.parse(current)
        return JSON.stringify({ ...parsed, items: patch(parsed.items) })
      })
      toast.success('Nowy zrzut strony gotowy.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setShotting(false)
    }
  }

  const move = (id, direction) => {
    const index = visible.findIndex(entry => entry.id === id)
    const neighbour = visible[index + direction]
    if (!neighbour) return
    setItems(list => {
      const next = [...list]
      const a = next.findIndex(entry => entry.id === id)
      const b = next.findIndex(entry => entry.id === neighbour.id)
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }

  const remove = () => {
    if (!item || !window.confirm(`Usunąć link „${item.title}”? Zmiana zadziała po zapisie.`)) return
    const index = visible.findIndex(entry => entry.id === item.id)
    setItems(list => list.filter(entry => entry.id !== item.id))
    select(visible[index + 1]?.id || visible[index - 1]?.id || '')
  }

  /* ── kategorie ── */

  const setCategories = next => setData(current => ({ ...current, categories: next }))
  const moveCategory = (index, direction) => {
    const next = [...categories]
    const [moved] = next.splice(index, 1)
    next.splice(index + direction, 0, moved)
    setCategories(next)
  }

  if (!data) {
    return error
      ? <Empty>{error}</Empty>
      : <div className="ap-inline-loading"><LoaderCircle className="spin" size={16} /> Ładowanie linków…</div>
  }

  const duplicate = item && duplicateOf(item.url, item.id)
  const savedItem = item && JSON.parse(saved || '{"items":[]}').items.find(entry => entry.id === item.id)
  const itemUrl = item && normalizeUrl(item.url)

  return (
    <div className="ap-stack ap-links">
      <section className="ap-links-hero">
        <div className="ap-links-stats">
          <div><b>{stats.total}</b><span>linków</span></div>
          <div><b>{stats.published}</b><span>widocznych</span></div>
          <div><b>{stats.featured}</b><span>polecanych</span></div>
          <div><b>{stats.clicks}</b><span>przejść</span></div>
        </div>
        <form className="ap-links-quick" onSubmit={quickAdd}>
          <Link2 size={17} />
          <input
            ref={quickRef}
            value={quick}
            onChange={event => setQuick(event.target.value)}
            onPaste={event => {
              const text = event.clipboardData.getData('text')
              if (/\s/.test(text.trim())) { event.preventDefault(); setBulk(text); setBulkOpen(true) }
            }}
            placeholder="Wklej adres strony, np. excalidraw.com"
            aria-label="Adres nowego linku"
            disabled={adding}
          />
          <button type="submit" className="ap-btn ap-btn-primary" disabled={adding || !quick.trim()}>
            {adding ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
            {adding ? 'Czytam stronę…' : 'Dodaj link'}
          </button>
          <button type="button" className="ap-btn ap-btn-ghost" onClick={() => setBulkOpen(value => !value)} aria-expanded={bulkOpen}>
            <ListPlus size={15} /> Wiele naraz
          </button>
          <a className="ap-btn ap-btn-ghost" href="/przydatne-linki" target="_blank" rel="noreferrer">
            Otwórz stronę <ArrowUpRight size={14} />
          </a>
        </form>
        <p className="ap-hint">Wystarczy adres – serwer sam odczyta tytuł, opis i favicon, a po zapisie zrobi zrzut strony na miniaturę. Nowe linki trafiają na górę wybranej kategorii{filter ? ` („${categoryName(filter)}”)` : ` („${categoryName(categories[0]?.id)}”)`}.</p>
        {bulkOpen && (
          <div className="ap-links-bulk">
            <textarea
              rows={5}
              value={bulk}
              onChange={event => setBulk(event.target.value)}
              placeholder={'Jeden adres w wierszu:\nhttps://excalidraw.com\nhttps://fonts.google.com'}
              disabled={Boolean(bulkProgress)}
            />
            <div className="ap-links-bulk-bar">
              {bulkProgress
                ? <span><LoaderCircle className="spin" size={14} /> Czytam strony: {bulkProgress.done + 1} z {bulkProgress.total}</span>
                : <span>{bulk.split(/[\s,;]+/).filter(Boolean).length} adresów do dodania</span>}
              <button type="button" className="ap-btn ap-btn-primary ap-btn-sm" onClick={bulkAdd} disabled={Boolean(bulkProgress) || !bulk.trim()}>
                Dodaj wszystkie
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="ap-projects-layout">
        <aside className="ap-plist">
          <div className="ap-plist-head ap-links-head">
            <label className="ap-plist-search">
              <Search size={13} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Szukaj w linkach" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Wyczyść"><X size={13} /></button>}
            </label>
            <select className="ap-links-filter" value={filter} onChange={event => setFilter(event.target.value)} aria-label="Kategoria">
              <option value="">Wszystkie kategorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} ({items.filter(entry => entry.category === category.id).length})
                </option>
              ))}
            </select>
          </div>
          <div className="ap-plist-scroll">
            {!visible.length && (
              <p className="ap-plist-none">{items.length ? 'Nic nie pasuje do wyszukiwania.' : 'Brak linków. Wklej pierwszy adres powyżej.'}</p>
            )}
            {visible.map((entry, index) => (
              <div key={entry.id} className={`ap-prow ${entry.id === selected ? 'is-active' : ''}`}>
                <button type="button" className="ap-prow-pick" onClick={() => select(entry.id)}>
                  <LinkIcon item={entry} />
                  <span className="ap-prow-text">
                    <strong>{entry.title || 'Bez tytułu'}</strong>
                    <small>{domainOf(entry.url) || 'brak adresu'}{!filter && ` · ${categoryName(entry.category)}`}</small>
                  </span>
                  <span className="ap-prow-flags">
                    {entry.featured && <Star size={12} className="is-gold" />}
                    {!entry.published && <EyeOff size={12} />}
                  </span>
                </button>
                <div className="ap-prow-order">
                  <button type="button" onClick={() => move(entry.id, -1)} disabled={index === 0} aria-label="Wyżej"><ArrowUp size={12} /></button>
                  <button type="button" onClick={() => move(entry.id, 1)} disabled={index === visible.length - 1} aria-label="Niżej"><ArrowDown size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="ap-projects-form">
          {!item ? (
            <Empty>Wybierz link z listy albo wklej nowy adres powyżej.</Empty>
          ) : (
            <>
              <header className="ap-pe-head">
                <LinkIcon item={item} size={44} />
                <div className="ap-pe-title">
                  <input className="ap-pe-name" value={item.title} onChange={event => update({ title: event.target.value })} aria-label="Tytuł" placeholder="Tytuł linku" />
                  <span className="mono">{domainOf(item.url) || 'brak adresu'} · dodano {formatDay(item.createdAt)} · {item.clicks || 0} przejść</span>
                </div>
                <div className="ap-pe-tools">
                  <button type="button" className={`ap-chip ${item.published ? 'is-live' : ''}`} onClick={() => update({ published: !item.published })}>
                    {item.published ? <Eye size={13} /> : <EyeOff size={13} />} {item.published ? 'Widoczny' : 'Ukryty'}
                  </button>
                  <button type="button" className={`ap-chip ${item.featured ? 'is-gold' : ''}`} onClick={() => update({ featured: !item.featured })}>
                    <Star size={13} /> {item.featured ? 'Polecany' : 'Wyróżnij'}
                  </button>
                  <span className="ap-pe-sep" />
                  {itemUrl && (
                    <a className="ap-icon-btn" href={itemUrl} target="_blank" rel="noreferrer" title="Otwórz stronę"><ArrowUpRight size={14} /></a>
                  )}
                  <button type="button" className="ap-icon-btn is-danger" onClick={remove} title="Usuń link"><Trash2 size={14} /></button>
                </div>
              </header>

              <div className="ap-pe-body">
                <div className="ap-links-url">
                  <Field label="Adres strony" hint={duplicate ? `Uwaga: ten adres ma już link „${duplicate.title}”.` : !itemUrl && item.url ? 'Adres musi zaczynać się od http(s):// albo być domeną.' : ''}>
                    <input value={item.url} onChange={event => update({ url: event.target.value })} onBlur={() => itemUrl && itemUrl !== item.url && update({ url: itemUrl })} placeholder="https://" />
                  </Field>
                  <button type="button" className="ap-btn ap-btn-ghost" onClick={refetch} disabled={fetching || !itemUrl} title="Nadpisuje tytuł, opis i favicon danymi ze strony">
                    {fetching ? <LoaderCircle className="spin" size={15} /> : <Wand2 size={15} />} Pobierz ze strony
                  </button>
                </div>

                <Field label="Opis" hint={`${(item.description || '').length}/600 · co to za strona, w jednym–dwóch zdaniach`}>
                  <textarea rows={3} maxLength={600} value={item.description} onChange={event => update({ description: event.target.value })} placeholder="Co znajdziesz na tej stronie?" />
                </Field>

                <div className="ap-two">
                  <Field label="Kategoria">
                    <select value={item.category} onChange={event => update({ category: event.target.value })}>
                      {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Tagi" hint="Po przecinku, np. darmowe, design, ai">
                    <input
                      value={Array.isArray(item.tags) ? item.tags.join(', ') : item.tags}
                      onChange={event => update({ tags: event.target.value.split(',').map(tag => tag.replace(/^\s+/, '')) })}
                      onBlur={() => update({ tags: [...new Set((item.tags || []).map(tag => tag.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))] })}
                      placeholder="darmowe, narzędzie"
                    />
                  </Field>
                </div>

                <div className="ap-links-shot">
                  <div className="ap-links-shot-frame">
                    {item.shot
                      ? <img src={item.shot} alt={`Zrzut strony ${domainOf(item.url)}`} />
                      : <span>{shotting ? 'Robię zrzut strony…' : savedItem ? 'Zrzut w kolejce – pojawi się po chwili.' : 'Zrzut powstanie po zapisaniu linku.'}</span>}
                  </div>
                  <div className="ap-links-shot-side">
                    <strong>Miniatura</strong>
                    <p className="ap-hint">
                      {data.screenshots === false
                        ? 'Ten serwer nie ma przeglądarki do zrzutów – karta pokaże favicon.'
                        : 'Serwer robi zrzut górnej części strony (1280×800) i pokazuje go jako miniaturę karty.'}
                      {item.shotAt && ` Ostatni zrzut: ${formatDay(item.shotAt)}.`}
                    </p>
                    <button type="button" className="ap-btn ap-btn-ghost ap-btn-sm" onClick={reshoot} disabled={shotting || !savedItem || savedItem.url !== item.url || data.screenshots === false}>
                      {shotting ? <LoaderCircle className="spin" size={14} /> : <Camera size={14} />} {item.shot ? 'Zrób nowy zrzut' : 'Zrób zrzut teraz'}
                    </button>
                  </div>
                </div>

                <div className="ap-pe-group">
                  <ImagePicker
                    label="Ikona"
                    value={item.icon}
                    onChange={icon => update({ icon })}
                    hint="Favicon pobierany automatycznie ze strony. Możesz też wybrać własny obrazek z biblioteki; bez ikony pokaże się pierwsza litera."
                  />
                </div>

                <div className="ap-switch-row">
                  <Toggle label="Widoczny na stronie" checked={item.published} onChange={published => update({ published })} />
                  <Toggle label="Polecany" hint="Wyróżniona karta na górze strony" checked={item.featured} onChange={featured => update({ featured })} />
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Card title="Kategorie" description="Kolejność kategorii to kolejność sekcji na stronie. Pustej kategorii strona nie pokazuje.">
        <div className="ap-links-cats">
          {categories.map((category, index) => {
            const count = items.filter(entry => entry.category === category.id).length
            return (
              <div className="ap-links-cat" key={category.id}>
                <input
                  value={category.name}
                  onChange={event => setCategories(categories.map(entry => (entry.id === category.id ? { ...entry, name: event.target.value } : entry)))}
                  aria-label="Nazwa kategorii"
                />
                <input
                  value={category.description || ''}
                  onChange={event => setCategories(categories.map(entry => (entry.id === category.id ? { ...entry, description: event.target.value } : entry)))}
                  placeholder="Krótki opis (opcjonalnie)"
                  aria-label="Opis kategorii"
                />
                <span className="ap-links-cat-count">{count}</span>
                <div className="ap-repeater-tools">
                  <button type="button" onClick={() => moveCategory(index, -1)} disabled={index === 0} aria-label="Wyżej"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} aria-label="Niżej"><ArrowDown size={14} /></button>
                  <button
                    type="button"
                    className="is-danger"
                    disabled={count > 0}
                    title={count ? 'Najpierw przenieś albo usuń linki z tej kategorii' : 'Usuń kategorię'}
                    onClick={() => setCategories(categories.filter(entry => entry.id !== category.id))}
                    aria-label="Usuń"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          <button type="button" className="ap-add" onClick={() => setCategories([...categories, { id: uid(), name: 'Nowa kategoria', description: '' }])}>
            <Plus size={15} /> Dodaj kategorię
          </button>
        </div>
      </Card>

      {!items.length && (
        <div className="ap-links-tip">
          <Sparkles size={16} />
          <span>Wskazówka: możesz wkleić całą listę adresów naraz – pole szybkiego dodawania samo otworzy import.</span>
          <button type="button" className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => quickRef.current?.focus()}><Globe size={14} /> Dodaj pierwszy link</button>
        </div>
      )}

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onReset={() => { setData(JSON.parse(saved)); toast.info('Cofnięto niezapisane zmiany.') }}
        resetLabel="Cofnij zmiany"
        info={<><MousePointerClick size={14} /> Niezapisane zmiany w linkach (Ctrl+S zapisuje).</>}
      />
    </div>
  )
}
