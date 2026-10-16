/**
 * Przesuwa granicę między tytułem a złotą końcówką („accent”) w dwóch
 * nagłówkach, tak żeby złote były tylko słowa niosące sens:
 * „W czym mogę pomóc” i „Od pierwszej rozmowy po stałą opiekę”.
 *
 * Działa raz (znacznik), żeby nie nadpisać późniejszych zmian z panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-heading-split-v17')

export const SPLITS = {
  scope: { title: 'W czym mogę', accent: 'pomóc' },
  process: { title: 'Od pierwszej rozmowy po', accent: 'stałą opiekę' },
}

const exists = file => fs.access(file).then(() => true).catch(() => false)

if (process.argv[1]?.endsWith('migrate-heading-split-v17.mjs')) {
  if (await exists(markerFile)) process.exit(0)
  if (await exists(contentFile)) {
    const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
    for (const [key, split] of Object.entries(SPLITS)) content[key] = { ...content[key], ...split }
    const temp = `${contentFile}.tmp`
    await fs.writeFile(temp, JSON.stringify(content, null, 2))
    await fs.rename(temp, contentFile)
    console.log('Podział nagłówków: content.json')
  }
  await fs.writeFile(markerFile, new Date().toISOString())
}
