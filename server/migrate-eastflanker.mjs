/** Jednorazowo dopisuje East Flanker do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-eastflanker-v1')

const project = {
  id: 'prj-eastflanker',
  name: 'East Flanker',
  href: '/eastflanker/',
  label: 'OSINT / analiza danych',
  statement: 'Obraz sytuacji na wschodniej flance NATO, złożony na żywo z kilkudziesięciu otwartych źródeł.',
  description: 'Ruch lotniczy i morski, zakłócenia GNSS, infrastruktura podmorska, łączność, sejsmika i doniesienia medialne na jednej mapie. System wykrywa anomalie, łączy zdarzenia z różnych dziedzin w zbieżności i przygotowuje raport dnia.',
  features: [
    'ADS-B i AIS w czasie rzeczywistym',
    'mapa zakłóceń GNSS z przedziałami ufności',
    'anomalie statków nad kablami i rurociągami',
    'zbieżności zdarzeń i raport dnia',
  ],
  slides: ['/assets/portfolio/eastflanker-1.png'],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = content?.work?.items

  if (Array.isArray(items) && !items.some(item => item?.id === project.id)) {
    const backup = path.join(dataDir, 'content.before-eastflanker.json')
    if (!await exists(backup)) await fs.copyFile(contentFile, backup)
    items.push(project)
    if (/^Dziewięć działających produktów\./.test(content.work.lead || '')) {
      content.work.lead = content.work.lead.replace(/^Dziewięć/, 'Dziesięć')
    }
    const temporary = `${contentFile}.${process.pid}.tmp`
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporary, contentFile)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
