/**
 * Upraszcza teksty strony głównej dla osób spoza branży: zakres oferty,
 * kompetencje w „O mnie”, kroki procesu i FAQ. Te same teksty są w
 * content.default.json; tu trafiają do treści zapisanych przez panel.
 *
 * Działa raz (znacznik w katalogu danych), więc późniejsze zmiany
 * wprowadzone w panelu nie zostaną nadpisane.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-plain-copy-v16')
const here = path.dirname(fileURLToPath(import.meta.url))
const copy = JSON.parse(await fs.readFile(path.join(here, 'copy', 'plain-v16.json'), 'utf8'))

const exists = file => fs.access(file).then(() => true).catch(() => false)
if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  content.scope = { ...content.scope, ...copy.scope }
  content.about = { ...content.about, strengths: copy.strengths }
  content.process = { ...content.process, items: copy.process }
  content.faq = { ...content.faq, items: copy.faq }
  const temp = `${contentFile}.tmp`
  await fs.writeFile(temp, JSON.stringify(content, null, 2))
  await fs.rename(temp, contentFile)
  console.log('Prostsze teksty: content.json')
}

await fs.writeFile(markerFile, new Date().toISOString())
