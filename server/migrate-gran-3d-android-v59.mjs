/**
 * GRAŃ 4.0: wersja na Androida, mapy offline i punkty z komentarzami. Aktualizuje opis pracy
 * w portfolio (etykieta, streszczenie, funkcje, technologie). Pliki do pobrania (instalator Windows
 * i APK) przychodzą same z wydania na GitHubie (`releaseSource: 'github'`). Pozostałe pola – bez zmian.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-gran-3d-android-v59')

const update = {
  label: 'Atlas szlaków górskich 3D / Windows i Android',
  tagline: 'Trójwymiarowy atlas gór na komputer i telefon: rzeczywisty model terenu, znakowane szlaki z OpenStreetMap, trasy z wariantami, mapy offline i punkty z komentarzami turystów.',
  summary: 'Natywny program w Rust na Windows i Androida – ten sam kod na obu systemach. Teren całej Europy z poziomami szczegółów, LiDAR i ortofotomapa, szlaki PTTK, planowanie tras z czasami i profilem, analizy widoczności, pobieranie obszarów do pracy bez internetu i punkty z komentarzami innych turystów.',
  body: 'GRAŃ łączy rzeczywisty model terenu z siecią znakowanych szlaków – na komputerze z Windows i na telefonie z Androidem, z tą samą funkcjonalnością. Teren wczytuje się kaflami wokół kamery, od widoku całych Karpat po pojedyncze żleby, a w Polsce i Czechach można pobrać model LiDAR 3 m i ortofotomapę z usług krajowych. Słońce świeci według daty i godziny, rzeźba rzuca cienie, a śnieg i barwy jesieni zmieniają się z porą roku.\n\nTrasy wyznacza się klikając (albo dotykając) punkty na mapie: program od razu proponuje warianty – najszybszy, najkrótszy, z najmniejszą sumą podejść i najłatwiejszy – z czasem według reguły PTTK albo DIN 33466, punktami GOT, profilem wysokości barwionym nachyleniem i przelotem kamery nad trasą. Ślady GPX, KML i FIT można wczytać i zapisać, a link gran:// otwiera ten sam widok u kogoś innego.\n\nMapy offline pobierają zaznaczony obszar w wybranej szczegółowości – teren, zdjęcia, szlaki, nazwy i drogi – i chronią go przed sprzątaniem do limitu miejsca; tryb offline całkowicie odcina sieć. Punkty i komentarze pozwalają opisać miejsce dla innych: utrudnienie na szlaku, źródło, punkt widokowy czy nocleg – wpisy trafiają na redzikowski.com i po zatwierdzeniu widzą je wszyscy użytkownicy. Na telefonie narzędzia są w dolnym pasku, szczegóły w arkuszu od dołu, a mapą steruje się gestami. Program sam pobiera kolejne wersje z redzikowski.com.',
  role: 'Pomysł, projekt, renderer terenu (wgpu), trasowanie i analizy, przetwarzanie danych OSM i LiDAR, interfejs na komputer i telefon, wersja na Androida, serwis punktów z moderacją, instalator i wydania',
  stack: ['Rust', 'wgpu', 'egui', 'WGSL', 'Android NDK', 'OpenStreetMap', 'NSIS'],
  features: [
    'teren 3D całej Europy z poziomami szczegółów, LiDAR 3 m i ortofoto (PL, CZ, SK)',
    'szlaki PTTK z OSM, warianty tras, czasy PTTK i DIN, punkty GOT, profil wysokości',
    'mapy offline: pobieranie obszaru w wybranej szczegółowości i tryb bez internetu',
    'punkty z komentarzami turystów, moderowane na redzikowski.com',
    'Słońce według daty i godziny, cienie rzeźby, widoczność, panorama i spacer',
    'Windows 10/11 i Android 8+, aktualizacje z redzikowski.com',
  ],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
let changed = 0
const next = current.map(item => {
  if (item?.slug !== 'gran-3d') return item
  changed += 1
  return { ...item, ...update, updatedAt: new Date().toISOString() }
})

if (changed) {
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`GRAŃ 4.0 w portfolio: zaktualizowano ${changed} wpis.`)
