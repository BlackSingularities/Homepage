/** Jednorazowo dopisuje PhotoStar do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-photostar-v1')

const project = {
  id: 'prj-photostar',
  name: 'PhotoStar',
  href: '/photostar/',
  hidden: false,
  linkHidden: false,
  label: 'Astronomia / analiza obrazu',
  statement: 'Rozpoznaje gwiazdy na zdjęciu nieba i pokazuje, na jaki fragment nieba patrzysz.',
  description: 'Własny serwer z astrometry.net dopasowuje wykryte gwiazdy do katalogu Tycho-2 bez żadnych podpowiedzi, a potem nakłada na zdjęcie gwiazdozbiory, 41 tys. gwiazd, 15 tys. mgławic i galaktyk, planety oraz horyzont. Do tego aparat z celownikiem AR i trybem nocnym oraz eksport plakatu. Prywatnie: wynik widzi tylko autor, a serwer kasuje zdjęcia po dobie. Za darmo, bez kont i limitów.',
  features: [
    'rozwiązanie astrometryczne bez podpowiedzi',
    'warstwy: gwiazdozbiory, obiekty, planety, horyzont',
    'aparat z celownikiem AR i składaniem klatek',
    'eksport plakatu, CSV i nagłówka WCS',
  ],
  slides: [
    '/assets/portfolio/photostar-1.png',
    '/assets/portfolio/photostar-2.png',
    '/assets/portfolio/photostar-3.png',
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
    const backup = path.join(dataDir, 'content.before-photostar.json')
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
