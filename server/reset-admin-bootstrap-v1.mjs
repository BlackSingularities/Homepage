/**
 * Jednorazowo usuwa zaimportowane, stare dane logowania i przywraca tryb
 * pierwszej konfiguracji. Poprzedni rekord zostaje zachowany jako kopia.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const adminFile = path.join(dataDir, 'admin.json')
const markerFile = path.join(dataDir, '.migration-reset-admin-bootstrap-v1')
const backupFile = path.join(dataDir, 'admin.before-bootstrap-reset-v1.json')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(adminFile)) {
  if (!await exists(backupFile)) await fs.copyFile(adminFile, backupFile)
  await fs.unlink(adminFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
