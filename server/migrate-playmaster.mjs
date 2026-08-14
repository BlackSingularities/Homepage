/** Jednorazowo dopisuje PlayMaster do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-playmaster-v1')

const project = {
  id: 'prj-playmaster',
  name: 'PlayMaster',
  href: '/PlayMaster/',
  label: 'Music learning / MIDI',
  statement: 'Interaktywna nauka gry, w której nuty spotykają się z klawiaturą dokładnie we właściwym momencie.',
  description: 'Wodospad nut, klasyczna notacja, wejście MIDI, trzy tryby pracy, biblioteka utworów oraz konta użytkowników połączone w jedno narzędzie do świadomego ćwiczenia.',
  features: [
    'wizualizacja MIDI w czasie rzeczywistym',
    'tryby słuchania, ćwiczenia i występu',
    '128 brzmień General MIDI',
    'biblioteka i konta użytkowników',
  ],
  slides: ['/assets/portfolio/playmaster-1.png'],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = content?.work?.items

  if (Array.isArray(items) && !items.some(item => item?.id === project.id)) {
    const backup = path.join(dataDir, 'content.before-playmaster.json')
    if (!await exists(backup)) await fs.copyFile(contentFile, backup)
    items.push(project)
    if (content.work.lead === 'Pięć działających produktów. Każdy zaprojektowany od zera, każdy rozwiązujący inny zestaw problemów.') {
      content.work.lead = 'Sześć działających produktów. Każdy zaprojektowany od zera, każdy rozwiązujący inny zestaw problemów.'
    }
    const temporary = `${contentFile}.${process.pid}.tmp`
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporary, contentFile)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
