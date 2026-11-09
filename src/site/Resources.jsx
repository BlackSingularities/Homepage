import { useEffect, useState } from 'react'
import { Download, ArrowUpRight } from 'lucide-react'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'
import { applySeo } from '../lib/seo'
import SectionHead from './SectionHead'
import '../styles/resources.css'

export default function Resources({ slug, onNavigate }) {
  const { lang, lp } = useT()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => { api('/api/resources').then(setData).catch(e => setError(e.message)) }, [])
  const item = data?.items.find(item => item.slug === slug)
  useEffect(() => { applySeo({ lang, path: `/do-pobrania${slug ? `/${slug}` : ''}`, title: item?.title || 'Do pobrania', description: item?.summary || 'Autorskie presety i materiały Adama Rędzikowskiego do pobrania.' }) }, [lang, slug, item])
  const go = event => { event.preventDefault(); onNavigate(event.currentTarget.getAttribute('href')) }
  const size = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (!data) return <main className="catalog section"><p role="status">{error || 'Ładowanie materiałów…'}</p></main>
  if (slug && !item) return <main className="catalog section"><h1>Nie znaleziono materiału</h1><a href={lp('/do-pobrania')} onClick={go}>Wszystkie materiały</a></main>
  return <main className="catalog resources"><section className="section">
    {item ? <>
      <a href={lp('/do-pobrania')} onClick={go}>← Wszystkie materiały</a>
      <SectionHead level="h1" title={item.title} lead={item.summary} />
      <div className="resource-detail"><article>
        <p className="resource-copy">{item.description}</p>
        {[['Instalacja i użycie', item.instructions], ['Wymagania', item.requirements], ['Licencja', item.license]].filter(([, text]) => text).map(([title, text]) => <section key={title}><h2>{title}</h2><p className="resource-copy">{text}</p></section>)}
      </article><aside className="resource-card"><span className="eyebrow">PLIKI DO POBRANIA</span><h2>Twój następny krok.</h2><p>Bez konta. Pobierz i zacznij korzystać.</p>{item.version && <p>Wersja {item.version}</p>}{item.files.map(file => <a className="resource-download" key={file.id} href={file.href} download><Download size={20} /><span>{file.name}<small>{size(file.size)}</small></span></a>)}</aside></div>
    </> : <>
      <SectionHead level="h1" title="Do pobrania" accent="Do Twojej pracy." lead="Autorskie presety i przydatne materiały. Wybierz coś dla siebie i korzystaj we własnym tempie." />
      <div className="resource-tools"><label>Szukaj materiałów<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nazwa, opis…" /></label><div className="catalog-filters"><button className={`chip ${!category ? 'is-active' : ''}`} onClick={() => setCategory('')}>Wszystkie</button>{data.categories.map(c => <button key={c.id} className={`chip ${category === c.id ? 'is-active' : ''}`} onClick={() => setCategory(c.id)}>{c.name}</button>)}</div></div>
      <div className="resource-grid">{data.items.filter(i => (!category || i.category === category) && `${i.title} ${i.summary}`.toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl'))).map(i => <article key={i.id} className="resource-card"><span className="eyebrow">{data.categories.find(c => c.id === i.category)?.name}</span><Download size={32} /><h2><a href={lp(`/do-pobrania/${i.slug}`)} onClick={go}>{i.title}</a></h2><p>{i.summary}</p><small>{i.files.length} plik(i) · {size(i.files.reduce((sum, f) => sum + f.size, 0))}</small><a className="resource-link" href={lp(`/do-pobrania/${i.slug}`)} onClick={go}>Zobacz i pobierz <ArrowUpRight size={18} /></a></article>)}</div>
      {!data.items.some(i => (!category || i.category === category) && `${i.title} ${i.summary}`.toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl'))) && <p role="status">Brak materiałów spełniających kryteria.</p>}
    </>}
  </section></main>
}
