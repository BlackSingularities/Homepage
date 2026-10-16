/**
 * Przebudowa strony: nowy frontend, nowe teksty i osobne portfolio.
 *
 * Treści strony głównej zmieniły kształt (zniknęły sekcje `work`, `services`,
 * `intelligence` i `manifesto`), więc zapisany `content.json` zostaje odłożony
 * na kopię i usunięty – serwer wraca do nowych wartości domyślnych. Portfolio
 * startuje puste: pozycje dodaje się w panelu, w zakładce Portfolio.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-rebuild-v12')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const backup = path.join(dataDir, 'content.before-rebuild-v12.json')
  if (!await exists(backup)) await fs.copyFile(contentFile, backup)
  await fs.rm(contentFile)
}

if (!await exists(projectsFile)) {
  await fs.writeFile(projectsFile, '[]\n', { mode: 0o600 })
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log('Przebudowa v12: treści przywrócone do domyślnych, portfolio puste.')
