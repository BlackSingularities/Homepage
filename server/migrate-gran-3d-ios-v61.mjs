/**
 * GRAŃ na iPhone’a i iPada: etykieta i funkcje pracy w portfolio obejmują iOS (pliki .ipa przychodzą
 * same z wydań `ios-v…`), plakaty do ponownego pobrania (plakat iOS obok Windows i Androida).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const postersFile = path.join(dataDir, 'posters.json')
const markerFile = path.join(dataDir, '.migration-gran-3d-ios-v61')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(projectsFile)) {
  const current = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  const next = current.map(item => {
    if (item?.slug !== 'gran-3d') return item
    const features = (item.features || []).map(line => line === 'Windows 10/11 i Android 8+, aktualizacje z redzikowski.com'
      ? 'Windows 10/11, Android 8+ oraz iPhone i iPad (iOS 15+, przez AltStore lub Sideloadly)'
      : line)
    return {
      ...item,
      label: 'Atlas szlaków górskich 3D / Windows, Android i iOS',
      features,
      stack: [...new Set([...(item.stack || []), 'Metal'])],
      updatedAt: new Date().toISOString(),
    }
  })
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
}

if (await exists(postersFile)) {
  const cache = JSON.parse(await fs.readFile(postersFile, 'utf8'))
  for (const key of Object.keys(cache)) if (key.toLowerCase().endsWith('#gran-3d')) delete cache[key]
  const temporary = `${postersFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, postersFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log('GRAŃ: iOS w portfolio.')
