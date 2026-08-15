/** Jednorazowo dopisuje Blinkbeam do istniejących treści CMS na produkcji. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-blinkbeam-v1')

const project = {
  id: 'prj-blinkbeam',
  name: 'Blinkbeam',
  href: '/Blinkbeam/',
  label: 'Optical transfer / privacy',
  statement: 'Pliki przesyłane światłem — bez sieci, serwera i konta.',
  description: 'Przeglądarkowa aplikacja dzieli plik na strumień kodów QR odporny na zgubione ramki. Drugi telefon składa dane aparatem i udostępnia plik dopiero po kryptograficznej weryfikacji całości.',
  features: [
    'transfer ekran → aparat',
    'brak wysyłki na serwer',
    'automatyczna optymalizacja tempa',
    'weryfikacja integralności SHA-256',
  ],
  slides: ['/assets/portfolio/blinkbeam-1.png'],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = content?.work?.items

  if (Array.isArray(items) && !items.some(item => item?.id === project.id)) {
    const backup = path.join(dataDir, 'content.before-blinkbeam.json')
    if (!await exists(backup)) await fs.copyFile(contentFile, backup)
    items.push(project)
    if (/^Siedem działających produktów\./.test(content.work.lead || '')) {
      content.work.lead = content.work.lead.replace(/^Siedem/, 'Osiem')
    }
    const temporary = `${contentFile}.${process.pid}.tmp`
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporary, contentFile)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
