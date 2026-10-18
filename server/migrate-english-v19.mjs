/**
 * Wersja angielska strony: tłumaczenia realizacji i podstron (pole `en`)
 * oraz uzupełnienie brakujących polskich opisów aplikacji – OpenShot nie
 * miał żadnej treści, OpenPDF i OpenTakeoff nie miały wprowadzenia ani
 * opisów zrzutów ekranu. Treść leży w copy/english-v19.json.
 *
 * Działa raz (znacznik), żeby nie nadpisać późniejszych zmian z panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const pagesFile = path.join(dataDir, 'pages.json')
const markerFile = path.join(dataDir, '.migration-english-v19')
const here = path.dirname(fileURLToPath(import.meta.url))
const copy = JSON.parse(await fs.readFile(path.join(here, 'copy', 'english-v19.json'), 'utf8'))

const exists = file => fs.access(file).then(() => true).catch(() => false)

async function writeJson(file, data) {
  const temp = `${file}.tmp`
  await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`)
  await fs.rename(temp, file)
}

if (await exists(markerFile)) process.exit(0)

const now = new Date().toISOString()

if (await exists(projectsFile)) {
  const projects = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  await fs.copyFile(projectsFile, path.join(dataDir, 'projects.before-english-v19.json'))
  const next = projects.map(project => {
    const entry = copy.projects[project.slug]
    if (!entry) return project
    const { shotAlts: plAlts = [], ...pl } = entry.pl || {}
    const shots = (project.shots || []).map((shot, index) => (
      !shot.alt && plAlts[index] ? { ...shot, alt: plAlts[index] } : shot
    ))
    return {
      ...project,
      ...pl,
      shots,
      cover: project.cover || shots[0]?.src || '',
      en: entry.en,
      updatedAt: now,
    }
  })
  await writeJson(projectsFile, next)
  console.log('Realizacje: opisy PL i tłumaczenia EN')
}

if (await exists(pagesFile)) {
  const pages = JSON.parse(await fs.readFile(pagesFile, 'utf8'))
  await fs.copyFile(pagesFile, path.join(dataDir, 'pages.before-english-v19.json'))
  const next = pages.map(page => {
    const en = copy.pages[page.slug]
    if (!en) return page
    return {
      ...page,
      en: { ...en, blocks: en.blocks.map(block => ({ id: crypto.randomUUID(), ...block })) },
      updatedAt: now,
    }
  })
  await writeJson(pagesFile, next)
  console.log('Podstrony: tłumaczenia EN')
}

await fs.writeFile(markerFile, now)
