/**
 * Uzupełnia brakującą okładkę istniejącej podstrony infrastruktury.
 * Nie nadpisuje obrazu wybranego wcześniej ręcznie w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const pagesFile = path.join(dataDir, 'pages.json')
const markerFile = path.join(dataDir, '.migration-infrastructure-cover-v11')
const pagesBackup = path.join(dataDir, 'pages.before-infrastructure-cover-v11.json')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

async function writeJson(file, data) {
  const temporary = `${file}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, file)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(pagesFile)) {
  const pages = JSON.parse(await fs.readFile(pagesFile, 'utf8'))
  const next = pages.map(page => (
    page.slug === 'infrastruktura-domowa' && !page.cover
      ? { ...page, cover: '/assets/brand/home-infrastructure.webp', updatedAt: new Date().toISOString() }
      : page
  ))

  if (!await exists(pagesBackup)) await fs.copyFile(pagesFile, pagesBackup)
  await writeJson(pagesFile, next)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
