/** Jednorazowo dopisuje Arcadię do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-arcadia-v1')

const project = {
  id: 'prj-arcadia',
  name: 'Arcadia',
  href: '/Arcadia/',
  label: 'Galeria gier / aplikacja webowa',
  statement: 'Wspólna przestrzeń dla dopracowanych gier przeglądarkowych — od klasyki po symulację lądowania na Księżycu.',
  description: 'Modułowa galeria z Tetrisem, Bubble Burst i LUNARIS, pełnoekranową rozgrywką, wspólnym rankingiem serwerowym oraz oprawą inspirowaną aparaturą misji Apollo.',
  features: [
    'trzy rozbudowane gry',
    'osobne rankingi i rekordy',
    'pełnoekranowa rozgrywka bez przewijania',
    'responsywny interfejs i obsługa dotykowa',
  ],
  slides: ['/assets/portfolio/arcadia-1.png'],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = content?.work?.items

  if (Array.isArray(items) && !items.some(item => item?.id === project.id)) {
    const backup = path.join(dataDir, 'content.before-arcadia.json')
    if (!await exists(backup)) await fs.copyFile(contentFile, backup)
    items.push(project)
    if (content.work.lead === 'Sześć działających produktów. Każdy zaprojektowany od zera, każdy rozwiązujący inny zestaw problemów.') {
      content.work.lead = 'Siedem działających produktów. Każdy zaprojektowany od zera, każdy rozwiązujący inny zestaw problemów.'
    }
    const temporary = `${contentFile}.${process.pid}.tmp`
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporary, contentFile)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
