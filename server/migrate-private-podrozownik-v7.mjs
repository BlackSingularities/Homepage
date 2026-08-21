/** Pokazuje Podróżownik w portfolio bez ujawniania jego prywatnego adresu. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-private-podrozownik-v7')
const backupFile = path.join(dataDir, 'content.before-private-podrozownik-v7.json')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const items = Array.isArray(content.work?.items) ? content.work.items : []
  const next = {
    ...content,
    work: {
      ...(content.work || {}),
      items: items.map(item => (
        item.id === 'prj-podrozownik' || item.href === '/travels'
          ? { ...item, hidden: false, linkHidden: true }
          : item
      )),
    },
  }
  if (!await exists(backupFile)) await fs.copyFile(contentFile, backupFile)
  const temporary = `${contentFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, contentFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
