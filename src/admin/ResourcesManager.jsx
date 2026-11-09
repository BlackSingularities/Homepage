import { useEffect, useState } from 'react'
import { api, json, uid } from '../lib/api'
import { Card, Text, Toggle, toast } from './parts'

export default function ResourcesManager() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  useEffect(() => { api('/api/admin/resources').then(setData).catch(e => setError(e.message)) }, [])
  useEffect(() => { const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const change = next => { setData(next); setDirty(true) }
  const item = data?.items.find(i => i.id === selected)
  const update = patch => change({ ...data, items: data.items.map(i => i.id === selected ? { ...i, ...patch } : i) })
  const save = async () => { setBusy(true); try { setData(await api('/api/admin/resources', json('PUT', data))); setDirty(false); toast.success('Biblioteka zapisana.') } catch (e) { toast.error(e.message) } finally { setBusy(false) } }
  const upload = async event => {
    const files = [...event.target.files]; event.target.value = ''; setBusy(true)
    const added = []
    try { for (const file of files) {
      if (file.size > 100 * 1024 * 1024) throw new Error('Maksymalny rozmiar pliku: 100 MB.')
      added.push(await api('/api/admin/resources/files', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file }))
    } } catch (e) { toast.error(e.message) } finally { if (added.length) update({ files: [...item.files, ...added] }); setBusy(false) }
  }
  if (!data) return <p role="status">{error || 'Ładowanie biblioteki…'}</p>
  return <div className="ap-stack"><Card title="Do pobrania" description="Osobna biblioteka publicznych materiałów. Zmiany publikujesz przyciskiem Zapisz bibliotekę.">
    <div className="ap-actions"><button className="ap-btn ap-btn-primary" disabled={busy} onClick={save}>{busy ? 'Praca…' : dirty ? 'Zapisz bibliotekę • niezapisane zmiany' : 'Zapisz bibliotekę'}</button> <a href="/do-pobrania" target="_blank" rel="noreferrer">Otwórz bibliotekę ↗</a></div>
  </Card><div className="ap-two"><div className="ap-stack"><Card title="Kategorie">
    {data.categories.map((c, index) => <div className="ap-stack" key={c.id}><Text label="Nazwa kategorii" value={c.name} onChange={name => change({ ...data, categories: data.categories.map((entry, n) => n === index ? { ...entry, name } : entry) })} /><button className="ap-btn" disabled={busy || data.items.some(i => i.category === c.id)} onClick={() => change({ ...data, categories: data.categories.filter(entry => entry.id !== c.id) })}>Usuń pustą kategorię</button></div>)}
    <button className="ap-btn" onClick={() => change({ ...data, categories: [...data.categories, { id: uid(), name: 'Nowa kategoria' }] })}>Dodaj kategorię</button>
  </Card><Card title="Materiały">
    {data.items.map(i => <button key={i.id} className="ap-row" onClick={() => setSelected(i.id)}><span className="ap-row-main"><b>{i.title}</b><i>{i.published ? 'Opublikowany' : 'Szkic'} · {i.downloads} pobrań</i></span></button>)}
    <button className="ap-btn" disabled={busy || !data.categories.length} onClick={() => { const id = uid(); change({ ...data, items: [...data.items, { id, title: 'Nowy materiał', slug: `material-${id}`, summary: '', description: '', instructions: '', requirements: '', license: '', version: '', category: data.categories[0].id, files: [], order: data.items.length, published: false, downloads: 0 }] }); setSelected(id) }}>Dodaj materiał</button>
  </Card></div>{item ? <Card title="Edycja materiału"><fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }} className="ap-stack">
    <Text label="Tytuł" value={item.title} onChange={title => update({ title })} /><Text label="Adres (slug)" value={item.slug} onChange={slug => update({ slug })} />
    <label className="ap-field">Kategoria<select value={item.category} onChange={e => update({ category: e.target.value })}>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {[['summary', 'Krótki opis'], ['description', 'Opis'], ['instructions', 'Instalacja i użycie'], ['requirements', 'Wymagania'], ['license', 'Licencja']].map(([key, label]) => <label className="ap-field" key={key}>{label}<textarea rows={4} value={item[key]} onChange={e => update({ [key]: e.target.value })} /></label>)}
    <Text label="Wersja" value={item.version} onChange={version => update({ version })} /><Text label="Kolejność (niższa = wyżej)" type="number" value={item.order} onChange={order => update({ order: Number(order) })} />
    <Toggle label="Opublikowany" checked={item.published} onChange={published => update({ published })} />
    <label>Dodaj pliki (maks. 100 MB każdy)<input type="file" multiple onChange={upload} /></label>
    {item.files.map(f => <div className="ap-row" key={f.id}><span className="ap-row-main">{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</span><button className="ap-btn" onClick={() => update({ files: item.files.filter(entry => entry.id !== f.id) })}>Odłącz</button></div>)}
    <button className="ap-btn" onClick={() => { if (window.confirm(`Usunąć materiał „${item.title}”?`)) { change({ ...data, items: data.items.filter(i => i.id !== item.id) }); setSelected('') } }}>Usuń materiał</button>
  </fieldset></Card> : <Card title="Wybierz materiał" description="Wybierz pozycję z listy albo dodaj nową." />}</div></div>
}
