/** Jednorazowo dopisuje Układ Okresowy do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-ukladokresowy-v1')

const project = {
  id: 'prj-ukladokresowy',
  name: 'Układ Okresowy',
  href: '/ukladokresowy/',
  hidden: false,
  linkHidden: false,
  label: 'Edukacja / wizualizacja danych',
  statement: 'Interaktywny atlas 118 pierwiastków z własnym panelem redakcyjnym.',
  description: 'Tablica Mendelejewa jako narzędzie, nie plakat: mapy cieplne właściwości, stan skupienia w dowolnej temperaturze, porównywarka i kalkulator masy molowej. Dane bazowe synchronizowane z otwartego źródła, polskie treści redagowane w CMS z pełną historią zmian.',
  features: [
    'mapy cieplne 8 właściwości',
    'stan skupienia od 0 do 6000 K',
    'porównywarka i kalkulator masy molowej',
    'CMS z historią zmian i synchronizacją API',
  ],
  slides: [
    '/assets/portfolio/ukladokresowy-1.png',
    '/assets/portfolio/ukladokresowy-2.png',
    '/assets/portfolio/ukladokresowy-3.png',
  ],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = content?.work?.items

  if (Array.isArray(items) && !items.some(item => item?.id === project.id)) {
    const backup = path.join(dataDir, 'content.before-ukladokresowy.json')
    if (!await exists(backup)) await fs.copyFile(contentFile, backup)
    // Galeria zdjęć zamyka listę realizacji, więc nowy projekt trafia tuż przed nią.
    const gallery = items.findIndex(item => item?.id === 'prj-gallery')
    items.splice(gallery === -1 ? items.length : gallery, 0, project)
    const temporary = `${contentFile}.${process.pid}.tmp`
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporary, contentFile)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
