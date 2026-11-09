import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { cleanText, slugify } from './sanitize.mjs'

export async function registerResources(app, { dataDir, readJson, updateJson, requireAdmin, enforceSameOrigin }) {
  const file = path.join(dataDir, 'resources.json')
  const directory = path.join(dataDir, 'resource-files')
  await fs.mkdir(directory, { recursive: true })
  const name = 'AR_Presets_Adam_Redzikowski.zip'
  await fs.copyFile(new URL(`./resources/${name}`, import.meta.url), path.join(directory, name), 1).catch(error => { if (error.code !== 'EEXIST') throw error })
  const size = (await fs.stat(path.join(directory, name))).size
  await updateJson(file, null, current => current || {
    categories: [{ id: 'fotografia', name: 'Fotografia' }],
    items: [{ id: 'ar-presets', slug: 'ar-presets', title: 'AR Presets — Camera Raw i Lightroom', category: 'fotografia',
      summary: '314 autorskich presetów XMP w 40 grupach. Od naturalnych portretów i krajobrazów po filmowe kolory i czerń i biel.',
      description: 'Komplet presetów Adama Rędzikowskiego wraz z katalogiem PDF, instrukcją instalacji i licencją. Najpierw dopasuj ekspozycję i balans bieli, potem wybierz preset i dostosuj efekt do zdjęcia.',
      instructions: 'Camera Raw: panel Presety → menu → Importuj profile i ustawienia predefiniowane. Lightroom Classic: moduł Wywołaj → Ustawienia predefiniowane → + → Importuj. Wskaż pobrany ZIP. Szczegółowa instrukcja znajduje się w paczce.',
      requirements: 'Camera Raw 13+ / Lightroom Classic 10+. Pliki XMP; Lightroom desktop, przez synchronizację także mobile.',
      license: 'Możesz edytować własne zdjęcia, także komercyjnie, i modyfikować presety na własny użytek. Bez pisemnej zgody autora nie wolno rozpowszechniać ani odsprzedawać plików. Pełna licencja w ZIP.',
      version: '1.0', published: true, order: 0, downloads: 0, files: [{ id: 'presets', stored: name, name, size }], updatedAt: new Date().toISOString() }],
  })
  const load = () => readJson(file, { categories: [], items: [] })
  const publicItem = item => ({ ...item, files: item.files.map(({ stored, ...asset }) => ({ ...asset, href: `/api/resources/${item.slug}/files/${asset.id}` })) })
  app.get('/api/resources', async (_req, res) => {
    const data = await load()
    res.json({ categories: data.categories, items: data.items.filter(item => item.published).sort((a, b) => a.order - b.order).map(publicItem) })
  })
  app.get('/api/resources/:slug/files/:id', async (req, res) => {
    const data = await load()
    const item = data.items.find(item => item.published && item.slug === req.params.slug)
    const asset = item?.files.find(asset => asset.id === req.params.id)
    if (!asset) return res.status(404).json({ error: 'Nie znaleziono pliku.' })
    res.set('X-Content-Type-Options', 'nosniff')
    res.download(path.join(directory, path.basename(asset.stored)), asset.name, async error => {
      if (!error) await updateJson(file, data, current => ({ ...current, items: current.items.map(entry => entry.id === item.id ? { ...entry, downloads: entry.downloads + 1 } : entry) })).catch(() => {})
      else if (!res.headersSent) res.status(404).end()
    })
  })
  app.get('/api/admin/resources', requireAdmin, async (_req, res) => res.json(await load()))
  app.post('/api/admin/resources/files', requireAdmin, enforceSameOrigin, express.raw({ type: 'application/octet-stream', limit: '100mb' }), async (req, res) => {
    const name = cleanText(decodeURIComponent(req.get('X-File-Name') || ''), 180).replace(/[\\/\r\n]/g, '_')
    if (!name || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Wybierz niepusty plik (maks. 100 MB).' })
    const id = crypto.randomUUID()
    await fs.writeFile(path.join(directory, id), req.body)
    res.json({ id, stored: id, name, size: req.body.length })
  })
  app.put('/api/admin/resources', requireAdmin, enforceSameOrigin, async (req, res) => {
    const source = req.body
    if (!Array.isArray(source.categories) || !Array.isArray(source.items)) return res.status(400).json({ error: 'Nieprawidłowe dane biblioteki.' })
    const categories = source.categories.map(c => ({ id: slugify(c.id || c.name), name: cleanText(c.name, 100) }))
    if (categories.some(c => !c.id || !c.name) || new Set(categories.map(c => c.id)).size !== categories.length) return res.status(400).json({ error: 'Kategorie muszą mieć unikalne identyfikatory i nazwy.' })
    const previous = await load()
    const items = []
    for (const raw of source.items) {
      const item = { id: cleanText(raw.id, 100) || crypto.randomUUID(), slug: slugify(raw.slug || raw.title), category: cleanText(raw.category, 100), published: raw.published === true, order: Number(raw.order) || 0, updatedAt: new Date().toISOString(), downloads: previous.items.find(i => i.id === raw.id)?.downloads || 0 }
      for (const key of ['title', 'summary', 'description', 'instructions', 'requirements', 'license', 'version']) item[key] = cleanText(raw[key], key === 'title' ? 200 : 12000)
      item.files = []
      for (const asset of raw.files || []) {
        if (!/^[a-zA-Z0-9_.-]+$/.test(asset.stored || '')) return res.status(400).json({ error: 'Nieprawidłowy plik.' })
        const stat = await fs.stat(path.join(directory, asset.stored)).catch(() => null)
        if (!stat?.isFile()) return res.status(400).json({ error: 'Plik nie istnieje. Wgraj go ponownie.' })
        item.files.push({ id: cleanText(asset.id, 100), stored: asset.stored, name: cleanText(asset.name, 180), size: stat.size })
      }
      if (!item.title || !item.slug || !categories.some(c => c.id === item.category) || (item.published && !item.files.length)) return res.status(400).json({ error: 'Podaj tytuł, kategorię, adres i plik dla publikowanego materiału.' })
      items.push(item)
    }
    if (new Set(items.map(i => i.slug)).size !== items.length || new Set(items.map(i => i.id)).size !== items.length) return res.status(400).json({ error: 'Adresy i identyfikatory materiałów muszą być unikalne.' })
    res.json(await updateJson(file, previous, current => ({ categories, items: items.map(item => ({ ...item, downloads: current.items.find(i => i.id === item.id)?.downloads || 0 })) })))
  })
}
