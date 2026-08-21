/**
 * Przenosi slider realizacji ze strony głównej na podstronę oferty
 * "Strony, aplikacje i autorskie CMS-y" (renderowany tam przez frontend).
 * Usuwa z tej podstrony statyczny blok galerii i domykający blok CTA, które
 * dublowałyby się z sekcją realizacji doklejaną pod treścią bloków.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const pagesFile = path.join(dataDir, 'pages.json')
const markerFile = path.join(dataDir, '.migration-work-to-offer-page-v10')
const pagesBackup = path.join(dataDir, 'pages.before-work-to-offer-page-v10.json')
const slug = 'strony-aplikacje-cms'

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(pagesFile)) {
  const pages = JSON.parse(await fs.readFile(pagesFile, 'utf8'))
  const next = pages.map(page => (
    page.slug === slug
      ? { ...page, blocks: page.blocks.filter(block => block.type !== 'gallery' && block.type !== 'cta') }
      : page
  ))

  if (!await exists(pagesBackup)) await fs.copyFile(pagesFile, pagesBackup)
  const temporary = `${pagesFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, pagesFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
