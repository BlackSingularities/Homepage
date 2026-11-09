import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { registerResources } from '../server/resources.mjs'
import { renderDocument, renderSitemap } from '../server/seo.mjs'

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'homepage-resources-'))
const app = express()
app.use((req, res, next) => req.path.endsWith('/files') ? next() : express.json()(req, res, next))
const readJson = async (file, fallback) => JSON.parse(await fs.readFile(file, 'utf8').catch(e => { if (e.code === 'ENOENT') return JSON.stringify(fallback); throw e }))
let queue = Promise.resolve()
const updateJson = (file, fallback, fn) => { const result = queue.then(async () => { const next = await fn(await readJson(file, fallback)); await fs.writeFile(file + '.tmp', JSON.stringify(next)); await fs.rename(file + '.tmp', file); return next }); queue = result.catch(() => {}); return result }
await registerResources(app, { dataDir, readJson, updateJson, requireAdmin: (req, res, next) => req.get('authorization') === 'test' ? next() : res.sendStatus(401), enforceSameOrigin: (req, res, next) => req.get('origin') && req.get('origin') !== `http://${req.get('host')}` ? res.sendStatus(403) : next() })
const server = app.listen(0, '127.0.0.1')
await new Promise(resolve => server.once('listening', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const request = (url, options) => fetch(base + url, options)
const headers = { authorization: 'test', 'Content-Type': 'application/json' }
try {
  const library = await (await request('/api/resources')).json()
  assert.equal(library.items.length, 1)
  assert.equal(library.items[0].files[0].stored, undefined)
  const download = await request(library.items[0].files[0].href)
  assert.equal(download.status, 200)
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), await fs.readFile(new URL('../server/resources/AR_Presets_Adam_Redzikowski.zip', import.meta.url)))
  assert.equal((await request('/api/admin/resources')).status, 401)
  assert.equal((await request('/api/admin/resources/files', { method: 'POST', body: 'blocked' })).status, 401)
  let admin = await (await request('/api/admin/resources', { headers })).json()
  const uploaded = await (await request('/api/admin/resources/files', { method: 'POST', headers: { authorization: 'test', 'Content-Type': 'application/octet-stream', 'X-File-Name': 'sample.txt' }, body: 'resource test' })).json()
  assert.equal(uploaded.size, 13)
  admin.items.push({ ...admin.items[0], id: 'draft', slug: 'draft', published: false, files: [uploaded] })
  assert.equal((await request('/api/admin/resources', { method: 'PUT', headers, body: JSON.stringify(admin) })).status, 200)
  assert.equal((await (await request('/api/resources')).json()).items.length, 1)
  assert.equal((await request('/api/resources/draft/files/' + uploaded.id)).status, 404)
  admin.items[1].published = true
  assert.equal((await request('/api/admin/resources', { method: 'PUT', headers, body: JSON.stringify(admin) })).status, 200)
  assert.equal(await (await request('/api/resources/draft/files/' + uploaded.id)).text(), 'resource test')
  admin.items[1].files[0].stored = '../admin.json'
  assert.equal((await request('/api/admin/resources', { method: 'PUT', headers, body: JSON.stringify(admin) })).status, 400)
  assert.equal((await request('/api/admin/resources', { method: 'PUT', headers: { ...headers, origin: 'https://other.example' }, body: JSON.stringify(admin) })).status, 403)
  const template = '<html><head></head><body><div id="root"></div></body></html>'
  for (const route of ['/do-pobrania', '/do-pobrania/ar-presets', '/en/do-pobrania/ar-presets']) {
    const result = await renderDocument(template, route, async () => ({ resources: library.items }))
    assert.equal(result.status, 200)
    assert.ok(result.html.includes('AR Presets'))
  }
  assert.equal((await renderDocument(template, '/do-pobrania/missing', async () => ({ resources: [] }))).status, 404)
  assert.ok(renderSitemap({ pages: [], projects: [], resources: library.items, updatedAt: '2026-11-04' }).includes('/do-pobrania/ar-presets'))
  console.log('Resources: seed, exact ZIP, auth, upload, save, drafts, publication, traversal, origin, SEO and sitemap passed.')
} finally {
  await new Promise(resolve => server.close(resolve))
  await queue
  await fs.rm(dataDir, { recursive: true, force: true })
}
