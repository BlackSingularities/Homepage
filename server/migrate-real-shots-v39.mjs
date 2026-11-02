/**
 * Prawdziwe zrzuty ekranu zamiast okładek SVG (FS Addon Toolkit, OpenMP, OpenDTP) i pierwsze
 * zrzuty Gothic Remake Save Explorer, który nie miał żadnych.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-real-shots-v39')

const p = name => `/assets/portfolio/${name}.webp`
const shots = {
  fsaddontoolkit: [
    { src: p('fsaddontoolkit-01-pulpit'), alt: 'Pulpit: aktywne dodatki, kategorie, profile i wolne miejsce na dyskach' },
    { src: p('fsaddontoolkit-02-dodatki'), alt: 'Dodatki z miniaturami, filtrami kategorii i przełącznikami włącz/wyłącz' },
    { src: p('fsaddontoolkit-03-mapa'), alt: 'Mapa lotnisk z dodatków z listą włączonych w widoku' },
  ],
  'gothic-save-explorer': [
    { src: p('gothic-save-explorer-01-eksplorator'), alt: 'Eksplorator zapisów z najnowszym zapisem i podsumowaniem postaci' },
    { src: p('gothic-save-explorer-02-zapis'), alt: 'Szczegóły zapisu: atrybuty postaci i zakładki danych gry' },
    { src: p('gothic-save-explorer-03-ekwipunek'), alt: 'Ekwipunek zapisu z liczbą stosów i przedmiotów' },
  ],
  opendtp: [
    { src: p('opendtp-01-ksztalty'), alt: 'Tekst wpisany w gwiazdę i opływający jej kontur, karta Kształty tekstu' },
    { src: p('opendtp-02-gazetka'), alt: 'Gazetka w trzech kolumnach z inicjałem i obrazem w tekście' },
    { src: p('opendtp-03-ulotka'), alt: 'Ulotka z tekstem wpisanym w koło' },
  ],
  openmp: [
    { src: p('openmp-01-radio'), alt: 'Radio internetowe: katalog stacji z kraju i świata' },
  ],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const current = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const next = current.map(item => shots[item.slug]
  ? { ...item, cover: shots[item.slug][0].src, shots: shots[item.slug], updatedAt: new Date().toISOString() }
  : item)

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log('Prawdziwe zrzuty ekranu w portfolio.')
