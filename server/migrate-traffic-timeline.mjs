/** Jednorazowo dopisuje Traffic Timeline do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-traffic-timeline-v1')

const project = {
  id: 'prj-traffic-timeline',
  name: 'Traffic Timeline',
  href: '/komunikacja/',
  label: 'Transport publiczny / mapy',
  statement: 'Cała doba komunikacji publicznej w Polsce, odtworzona z rozkładów jazdy na żywej mapie.',
  description: 'Oficjalne rozkłady GTFS z kilkunastu miast i całej sieci kolejowej przeliczone na ruch pojazdów w czasie. Każde źródło to osobna warstwa: tramwaje, autobusy, metro i pociągi wszystkich przewoźników.',
  features: [
    'animacja kursów w ciągu doby',
    'warstwy miast i przewoźników kolejowych',
    'sieć tras i obciążenie przystanków',
    'linki do konkretnego widoku i godziny',
  ],
  slides: ['/assets/portfolio/traffic-timeline-1.png'],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = content?.work?.items

  if (Array.isArray(items) && !items.some(item => item?.id === project.id)) {
    const backup = path.join(dataDir, 'content.before-traffic-timeline.json')
    if (!await exists(backup)) await fs.copyFile(contentFile, backup)
    items.push(project)
    if (/^Osiem działających produktów\./.test(content.work.lead || '')) {
      content.work.lead = content.work.lead.replace(/^Osiem/, 'Dziewięć')
    }
    const temporary = `${contentFile}.${process.pid}.tmp`
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporary, contentFile)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
