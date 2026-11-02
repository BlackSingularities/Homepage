/**
 * Ustawia publiczny adres kontaktowy kontakt@redzikowski.com w treściach
 * zapisanych przez panel (PL i EN). Pusty zapis nadpisywał wartość domyślną.
 *
 * Działa raz (znacznik w katalogu danych), więc późniejsze zmiany
 * wprowadzone w panelu nie zostaną nadpisane.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const EMAIL = 'kontakt@redzikowski.com'
const dataDir = process.env.DATA_DIR || '/app/data'
const markerFile = path.join(dataDir, '.migration-contact-email-v41')

const exists = file => fs.access(file).then(() => true).catch(() => false)
if (await exists(markerFile)) process.exit(0)

for (const name of ['content.json', 'content.en.json']) {
  const file = path.join(dataDir, name)
  if (!(await exists(file))) continue
  const content = JSON.parse(await fs.readFile(file, 'utf8'))
  content.brand = { ...content.brand, email: EMAIL }
  const temp = `${file}.tmp`
  await fs.writeFile(temp, JSON.stringify(content, null, 2))
  await fs.rename(temp, file)
  console.log(`Adres kontaktowy: ${name}`)
}

await fs.writeFile(markerFile, new Date().toISOString())
