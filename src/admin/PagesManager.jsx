import { useEffect, useMemo, useState } from 'react'
import {
  AlignLeft, ArrowUpRight, BadgeCheck, Copy, EyeOff, FileText, Image as ImageIcon, Images,
  LayoutGrid, Link2, LoaderCircle, MessageSquareQuote, Plus, Search, Sigma, Trash2,
} from 'lucide-react'
import { api, json, uid } from '../lib/api'
import {
  Area, Card, Dropzone, Empty, ImagePicker, LangTabs, toast, Repeater, SaveBar, Select, Text, Toggle, useMedia,
} from './parts'

const BLOCK_TYPES = [
  ['text', 'Tekst', AlignLeft],
  ['image', 'Zdjęcie', ImageIcon],
  ['gallery', 'Galeria', Images],
  ['features', 'Lista atutów', LayoutGrid],
  ['stats', 'Liczby', Sigma],
  ['quote', 'Cytat', MessageSquareQuote],
  ['cta', 'Wezwanie do działania', Link2],
]

const BLOCK_LABEL = Object.fromEntries(BLOCK_TYPES.map(([id, label]) => [id, label]))

function newBlock(type) {
  const base = { id: uid(), type }
  if (type === 'image') return { ...base, src: '', alt: '', caption: '', layout: 'default' }
  if (type === 'gallery') return { ...base, heading: '', images: [] }
  if (type === 'features') return { ...base, heading: '', items: [{ title: '', text: '' }] }
  if (type === 'stats') return { ...base, heading: '', items: [{ value: '', label: '' }] }
  if (type === 'quote') return { ...base, body: '', author: '' }
  if (type === 'cta') return { ...base, heading: '', body: '', label: 'Napisz do mnie', href: '/#kontakt' }
  return { ...base, heading: '', body: '', layout: 'default' }
}

function emptyPage() {
  return {
    title: 'Nowa strona',
    slug: '',
    kicker: '',
    excerpt: '',
    lead: '',
    cover: '',
    seoDescription: '',
    accent: 'gold',
    published: false,
    featured: true,
    blocks: [newBlock('text')],
    en: emptyTranslation(),
  }
}

function emptyTranslation() {
  return { title: '', kicker: '', excerpt: '', lead: '', seoDescription: '', blocks: [] }
}

function GalleryEditor({ block, patch }) {
  const { items, busy, upload } = useMedia()
  const add = url => patch({ images: [...block.images, { src: url, alt: '' }] })

  return (
    <>
      <Text label="Nagłówek galerii" value={block.heading} onChange={heading => patch({ heading })} placeholder="Opcjonalny tytuł" />
      <Dropzone
        compact
        busy={busy}
        onFiles={async files => {
          const uploaded = await upload(files)
          patch({ images: [...block.images, ...uploaded.map(file => ({ src: file.url, alt: '' }))] })
        }}
      />
      {block.images.length > 0 && (
        <div className="ap-gallery-edit">
          {block.images.map((image, index) => (
            <figure key={`${image.src}-${index}`}>
              <img src={image.src} alt="" />
              <input
                value={image.alt}
                placeholder="Opis alternatywny"
                onChange={event => patch({
                  images: block.images.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)),
                })}
              />
              <button type="button" onClick={() => patch({ images: block.images.filter((_, i) => i !== index) })} aria-label="Usuń">
                <Trash2 size={13} />
              </button>
            </figure>
          ))}
        </div>
      )}
      {items.length > 0 && block.images.length === 0 && (
        <div className="ap-gallery-suggest">
          <span>Z biblioteki:</span>
          {items.slice(0, 8).map(item => (
            <button type="button" key={item.name} onClick={() => add(item.url)}>
              <img src={item.url} alt="" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function BlockEditor({ block, patch }) {
  switch (block.type) {
    case 'image':
      return (
        <>
          <ImagePicker label="Zdjęcie" value={block.src} onChange={src => patch({ src })} />
          <div className="ap-grid-2">
            <Text label="Opis alternatywny" value={block.alt} onChange={alt => patch({ alt })} placeholder="Co przedstawia zdjęcie" />
            <Text label="Podpis pod zdjęciem" value={block.caption} onChange={caption => patch({ caption })} />
          </div>
          <Select
            label="Szerokość"
            value={block.layout}
            onChange={layout => patch({ layout })}
            options={[['default', 'Standardowa'], ['full', 'Pełna szerokość']]}
          />
        </>
      )

    case 'gallery':
      return <GalleryEditor block={block} patch={patch} />

    case 'features':
      return (
        <>
          <Text label="Nagłówek sekcji" value={block.heading} onChange={heading => patch({ heading })} />
          <Repeater
            items={block.items}
            onChange={items => patch({ items })}
            create={() => ({ title: '', text: '' })}
            addLabel="Dodaj atut"
            itemLabel={item => item.title || 'Atut'}
            render={(item, update) => (
              <>
                <Text label="Tytuł" value={item.title} onChange={title => update({ title })} />
                <Area label="Opis" value={item.text} onChange={text => update({ text })} rows={3} />
              </>
            )}
          />
        </>
      )

    case 'stats':
      return (
        <>
          <Text label="Nagłówek sekcji" value={block.heading} onChange={heading => patch({ heading })} />
          <Repeater
            items={block.items}
            onChange={items => patch({ items })}
            create={() => ({ value: '', label: '' })}
            addLabel="Dodaj liczbę"
            itemLabel={item => item.value || 'Liczba'}
            render={(item, update) => (
              <div className="ap-grid-2">
                <Text label="Wartość" value={item.value} onChange={value => update({ value })} placeholder="np. 120%" />
                <Text label="Podpis" value={item.label} onChange={label => update({ label })} />
              </div>
            )}
          />
        </>
      )

    case 'quote':
      return (
        <>
          <Area label="Treść cytatu" value={block.body} onChange={body => patch({ body })} rows={3} />
          <Text label="Autor" value={block.author} onChange={author => patch({ author })} placeholder="Kto to powiedział" />
        </>
      )

    case 'cta':
      return (
        <>
          <Text label="Nagłówek" value={block.heading} onChange={heading => patch({ heading })} />
          <Area label="Opis" value={block.body} onChange={body => patch({ body })} rows={2} />
          <div className="ap-grid-2">
            <Text label="Tekst przycisku" value={block.label} onChange={label => patch({ label })} />
            <Text label="Adres" value={block.href} onChange={href => patch({ href })} placeholder="/#kontakt" />
          </div>
        </>
      )

    default:
      return (
        <>
          <Text label="Nagłówek" value={block.heading} onChange={heading => patch({ heading })} placeholder="Opcjonalny nagłówek" />
          <Area
            label="Treść"
            value={block.body}
            onChange={body => patch({ body })}
            rows={7}
            hint="Pusta linia rozdziela akapity."
          />
          <Select
            label="Szerokość"
            value={block.layout}
            onChange={layout => patch({ layout })}
            options={[['default', 'Kolumna tekstu'], ['wide', 'Pełna szerokość']]}
          />
        </>
      )
  }
}

export default function PagesManager({ notify, item = '', onItem = () => {} }) {
  const [pages, setPages] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(null)
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState('pl')

  const load = async (selectSlugId = '') => {
    setLoading(true)
    try {
      const list = await api('/api/admin/pages')
      setPages(list)
      const next = list.find(page => page.id === (selectSlugId || selectedId))
        || (item ? list.find(page => page.slug === item) : null)
        || null
      if (next) {
        onItem(next.slug)
        setSelectedId(next.id)
        setDraft(structuredClone(next))
        setOriginal(structuredClone(next))
      }
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const select = page => {
    setSelectedId(page.id)
    setDraft(structuredClone(page))
    setOriginal(structuredClone(page))
    onItem(page.slug)
  }

  // „Wstecz” w przeglądarce zmienia adres – lista idzie za nim.
  useEffect(() => {
    if (loading || !item) return
    const target = pages.find(page => page.slug === item)
    if (target && target.id !== selectedId) select(target)
  }, [item, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = value => setDraft(current => ({ ...current, ...value }))
  const en = { ...emptyTranslation(), ...(draft?.en || {}) }
  // Pola edytują wersję wybraną w zakładce języka; puste pole angielskie
  // spada na stronie na polski oryginał, który widać tu jako podpowiedź.
  const value = key => (lang === 'en' ? en[key] : draft?.[key])
  const set = (key, next) => (lang === 'en'
    ? setDraft(current => ({ ...current, en: { ...emptyTranslation(), ...(current.en || {}), [key]: next } }))
    : patch({ [key]: next }))
  const hint = key => (lang === 'en' ? draft?.[key] : undefined)
  const blocks = lang === 'en' ? en.blocks : draft?.blocks || []

  const dirty = useMemo(
    () => Boolean(draft && original) && JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original],
  )

  const create = async () => {
    setSaving(true)
    try {
      const page = await api('/api/admin/pages', json('POST', emptyPage()))
      setPages(current => [...current, page])
      select(page)
      notify('Utworzyłem szkic nowej strony. Uzupełnij treść i opublikuj.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const saved = await api(`/api/admin/pages/${draft.id}`, json('PUT', draft))
      setPages(current => current.map(page => (page.id === saved.id ? saved : page)))
      setDraft(structuredClone(saved))
      setOriginal(structuredClone(saved))
      notify(`Zapisano stronę „${saved.title}”.`)
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async page => {
    if (!window.confirm(`Usunąć stronę „${page.title}”? Tej operacji nie można cofnąć.`)) return
    await api(`/api/admin/pages/${page.id}`, { method: 'DELETE' })
    setPages(current => current.filter(item => item.id !== page.id))
    if (page.id === selectedId) { setDraft(null); setSelectedId(''); onItem('') }
    notify('Strona została usunięta.')
  }

  const reorder = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= pages.length) return
    const next = [...pages]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setPages(next)
    await api('/api/admin/pages/reorder', json('POST', { ids: next.map(page => page.id) }))
  }

  const filtered = pages.filter(page =>
    !query || `${page.title} ${page.slug} ${page.kicker}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="ap-pages">
      <aside className="ap-pages-list">
        <div className="ap-pages-search">
          <Search size={15} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Szukaj strony…" />
        </div>

        <button className="ap-btn ap-btn-primary ap-new-page" onClick={create} disabled={saving}>
          <Plus size={16} /> Nowa strona
        </button>

        <div className="ap-pages-scroll">
          {loading && <div className="ap-inline-loading"><LoaderCircle className="spin" size={16} /> Wczytuję…</div>}
          {!loading && filtered.length === 0 && <Empty>Brak stron. Dodaj pierwszą podstronę oferty.</Empty>}
          {filtered.map((page, index) => (
            <article key={page.id} className={`ap-page-row ${page.id === selectedId ? 'is-active' : ''}`}>
              <button className="ap-page-open" onClick={() => select(page)}>
                <span className="ap-page-thumb">
                  {page.cover ? <img src={page.cover} alt="" /> : <FileText size={16} />}
                </span>
                <span className="ap-page-meta">
                  <b>{page.title}</b>
                  <i>/p/{page.slug}</i>
                </span>
                <span className={`ap-dot ${page.published ? 'is-live' : ''}`} title={page.published ? 'Opublikowana' : 'Szkic'}>
                  {page.published ? <BadgeCheck size={14} /> : <EyeOff size={14} />}
                </span>
              </button>
              <div className="ap-page-tools">
                <button onClick={() => reorder(index, -1)} disabled={index === 0} aria-label="W górę">↑</button>
                <button onClick={() => reorder(index, 1)} disabled={index === pages.length - 1} aria-label="W dół">↓</button>
                <button className="is-danger" onClick={() => remove(page)} aria-label="Usuń"><Trash2 size={13} /></button>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <div className="ap-pages-editor">

        {!draft ? (
          <Empty>Wybierz stronę z listy albo utwórz nową – dodasz do niej opisy, zdjęcia i galerie.</Empty>
        ) : (
          <>
            <Card
              title="Podstawy"
              description="Tytuł, adres i zajawka pokazywana na stronie głównej."
              actions={(
                <a className="ap-btn ap-btn-ghost" href={lang === 'en' ? `/en/p/${draft.slug}` : `/p/${draft.slug}`} target="_blank" rel="noreferrer">
                  Podgląd {lang.toUpperCase()} <ArrowUpRight size={14} />
                </a>
              )}
            >
              <LangTabs
                value={lang}
                onChange={setLang}
                hint={lang === 'en'
                  ? `Wersja angielska pod /en/p/${draft.slug}. Puste pola i brak bloków = polski oryginał.`
                  : 'Wersja polska – podstawowa. Adres, zdjęcia i ustawienia są wspólne.'}
              />
              <div className="ap-grid-2">
                <Text label="Tytuł strony" value={value('title')} onChange={next => set('title', next)} placeholder={hint('title')} />
                <Text label="Adres (slug)" value={draft.slug} onChange={slug => patch({ slug })} hint={`Strona będzie dostępna pod /p/${draft.slug || '…'}`} />
              </div>
              <div className="ap-grid-2">
                <Select
                  label="Kolor akcentu"
                  value={draft.accent}
                  onChange={accent => patch({ accent })}
                  options={[['gold', 'Złoty'], ['ivory', 'Kość słoniowa'], ['ember', 'Bursztyn'], ['mint', 'Mięta']]}
                />
              </div>
              <Area label="Zajawka (kafelek na stronie głównej)" value={value('excerpt')} onChange={next => set('excerpt', next)} rows={2} placeholder={hint('excerpt')} />
              <Area label="Wprowadzenie (nagłówek strony)" value={value('lead')} onChange={next => set('lead', next)} rows={3} placeholder={hint('lead')} />
              <Area label="Opis dla wyszukiwarek" value={value('seoDescription')} onChange={next => set('seoDescription', next)} rows={2} placeholder={hint('seoDescription')}
                hint={`${String(value('seoDescription') || '').length}/320 znaków. Najlepiej 120–158 – tyle Google pokazuje w wynikach.`} />
              <ImagePicker label="Zdjęcie główne" value={draft.cover} onChange={cover => patch({ cover })} hint="Widoczne w nagłówku strony i na kafelku." />
              <div className="ap-switch-row">
                <Toggle label="Opublikowana" hint="Widoczna dla odwiedzających" checked={draft.published} onChange={published => patch({ published })} />
                <Toggle label="Pokaż na stronie głównej" hint="Kafelek w sekcji oferty" checked={draft.featured} onChange={featured => patch({ featured })} />
              </div>
            </Card>

            <Card
              title={lang === 'en' ? 'Treść strony – English' : 'Treść strony'}
              description={lang === 'en'
                ? 'Bloki wersji angielskiej. Dopóki lista jest pusta, strona angielska pokazuje polskie bloki.'
                : 'Układaj stronę z bloków – tekstu, zdjęć, galerii, liczb i wezwań do działania.'}
            >
              {lang === 'en' && (
                <button
                  type="button"
                  className="ap-btn ap-btn-ghost"
                  onClick={() => {
                    if (en.blocks.length && !window.confirm('Zastąpić angielskie bloki kopią polskich?')) return
                    set('blocks', structuredClone(draft.blocks).map(block => ({ ...block, id: uid() })))
                  }}
                >
                  <Copy size={14} /> Skopiuj bloki z wersji polskiej do przetłumaczenia
                </button>
              )}
              <Repeater
                items={blocks}
                onChange={next => set('blocks', next)}
                create={() => newBlock('text')}
                addLabel="Dodaj blok tekstowy"
                itemLabel={block => `${BLOCK_LABEL[block.type] || 'Blok'}${block.heading ? ` – ${block.heading}` : ''}`}
                render={(block, update) => <BlockEditor block={block} patch={update} />}
              />

              <div className="ap-block-add">
                <span>Dodaj blok:</span>
                {BLOCK_TYPES.map(([type, label, Icon]) => (
                  <button key={type} type="button" onClick={() => set('blocks', [...blocks, newBlock(type)])}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </Card>

            <SaveBar
              dirty={dirty}
              saving={saving}
              onSave={save}
              onReset={() => setDraft(structuredClone(original))}
              resetLabel="Odrzuć zmiany"
              info={`Niezapisane zmiany na stronie „${draft.title}”.`}
            />
          </>
        )}
      </div>
    </div>
  )
}
