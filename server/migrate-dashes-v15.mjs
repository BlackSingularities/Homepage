/**
 * Zamienia pauzy (—) na polskie półpauzy (–) we wszystkich treściach
 * zapisanych przez panel: tekstach strony, podstronach i portfolio.
 *
 * Nie ma znacznika wykonania: zamiana jest idempotentna, więc przy każdym
 * wdrożeniu poprawia też pauzy wpisane w panelu od ostatniego razu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const files = ['content.json', 'pages.json', 'projects.json']

for (const name of files) {
  const file = path.join(dataDir, name)
  const raw = await fs.readFile(file, 'utf8').catch(() => null)
  if (raw === null || !raw.includes('—')) continue
  const fixed = raw.replaceAll('—', '–')
  JSON.parse(fixed)
  const temp = `${file}.tmp`
  await fs.writeFile(temp, fixed)
  await fs.rename(temp, file)
  console.log(`Półpauzy: ${name}`)
}
