/** Apply the approved app icons once; keep every other CMS field unchanged. */
import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-app-icons-v53')
const icons = JSON.parse(await fs.readFile(new URL('./app-icons-v53.json', import.meta.url), 'utf8'))
const exists = file => fs.access(file).then(() => true).catch(() => false)

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const original = await fs.readFile(projectsFile, 'utf8')
const projects = JSON.parse(original)
if (!Array.isArray(projects)) throw new Error('projects.json must contain an array')
const missing = Object.keys(icons).filter(slug => !projects.some(project => project.slug === slug))
if (missing.length) throw new Error(`Missing app projects: ${missing.join(', ')}`)

const now = new Date().toISOString()
const next = projects.map(project => icons[project.slug]
  ? { ...project, icon: icons[project.slug], updatedAt: now }
  : project)
// Save the exact original outside the deployed checkout for recovery.
const backup = path.join(dataDir, 'projects.before-app-icons-v53.json')
if (!(await exists(backup))) await fs.writeFile(backup, original, { mode: 0o600, flag: 'wx' })
const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)
await fs.writeFile(markerFile, `${now}\n`, { mode: 0o600 })
console.log(`Updated icons for ${Object.keys(icons).length} apps.`)
