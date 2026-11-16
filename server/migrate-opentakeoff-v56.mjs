/**
 * OpenTakeoff: opis pracy po wersji 3.4 – aplikacja na Androida i program na Windows (Rust) zamiast
 * dawnego OpenTakeoff Link w C#. Podmienia tylko teksty (PL i EN), stos i listę funkcji; zrzuty,
 * pliki do pobrania i ustawienia wydań zostają. Plakaty (Android i Windows) serwer pobiera sam
 * z `docs/posters/posters.json` w repozytorium, a instalator na Windows – z wydania na GitHubie.
 *
 * Działa raz (znacznik), żeby nie nadpisać późniejszych zmian z panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-opentakeoff-v56')

const pl = {
  label: 'Wirtualny pilot / Android, Windows',
  tagline: 'Pogoda, lotniska i kokpit dla symulatorów lotu – na telefonie i na drugim ekranie komputera.',
  summary: 'Darmowa aplikacja na Androida i program na Windows dla wirtualnych pilotów MSFS 2024 i X-Plane 11/12: pogoda lotniskowa, dane lotnisk i plan lotu na telefonie, a na komputerze przyrządy w stylu kabiny, mapa nawigacyjna z radarem opadów, dziennik lotów z analizą lądowania i odtwarzaniem w 3D.',
  body: 'Aplikacja na Androida łączy pogodę, informacje o lotniskach i mobilny kokpit. Oferuje interaktywne depesze METAR, prognozy TAF, komunikaty SIGMET i PIREP, pasy, częstotliwości i systemy ILS, a także ATIS czytany na głos. Mapa z widokiem 3D pokazuje lotniska, pogodę, trasę i ślad lotu z profilem wysokości, a plan lotu można przygotować ręcznie, wyznaczyć na mapie albo pobrać z SimBrief.\n\nOpenTakeoff na Windows łączy telefon z MSFS 2024 albo X-Plane 11/12 w sieci lokalnej (X-Plane bez wtyczek) – telefon staje się wtedy dodatkowym panelem: PFD i ND, silniki, dźwignie mocy, autopilot w stylu Airbusa, Boeinga, Garmina i KAP140, radio i systemy samolotu. Na samym komputerze program ma przyrządy w stylu sześciu kabin, ekran silników ECAM/EICAS i mapę nawigacyjną z różami VOR, narzędziem radiali, radarem opadów i METAR-ami lotnisk w kolorach kategorii lotu, a także widok 3D z kurtyną pod śladem.\n\nKażdy lot trafia do dziennika synchronizowanego z telefonem: ślad, wykresy, ocena lądowania i analiza ostatnich 30 sekund przed przyziemieniem na tle pasa, z góry i z boku, ze ścieżką 3°. Lot można odtworzyć na mapie albo w 3D z kamerą za samolotem. Statystyki liczą osiągnięcia z poziomami i co tydzień dają dwa wyzwania – lądowanie na trudnym lotnisku i zadanie z techniki. Dla streamerów: karta lądowania i pasek na ekranie symulatora oraz te same strony jako źródło przeglądarki w OBS. Program sam się aktualizuje przez redzikowski.com. Bez reklam, kont i kluczy API, po polsku, angielsku i hiszpańsku.',
  role: 'Projekt, wykonanie, wdrożenie',
  stack: ['Kotlin', 'Jetpack Compose', 'Material 3', 'Rust', 'Slint', 'tiny-skia', 'SimConnect'],
  features: [
    'pogoda lotniskowa: METAR, TAF, SIGMET, PIREP i ATIS czytany na głos',
    'mobilny kokpit dla MSFS 2024 i X-Plane 11/12',
    'przyrządy na Windows: PFD, ND, ECAM/EICAS w stylu sześciu kabin',
    'mapa nawigacyjna z radarem opadów, METAR-ami i radialami VOR',
    'dziennik z analizą lądowania i odtwarzaniem lotu w 3D',
    'osiągnięcia i wyzwania tygodnia, strony dla OBS',
    'Android 8+, Windows 10 i 11 z automatycznymi aktualizacjami',
  ],
}

const en = {
  label: 'Virtual pilot / Android, Windows',
  tagline: 'Weather, airports and a cockpit for flight simulators – on your phone and on a second screen.',
  summary: 'A free Android app and a Windows program for MSFS 2024 and X-Plane 11/12 virtual pilots: airport weather, airport data and flight planning on the phone, and on the PC cockpit-style instruments, a navigation map with precipitation radar, and a logbook with landing analysis and 3D replay.',
  body: 'The Android app brings together weather, airport information and a mobile cockpit. It offers interactive METAR reports, TAF forecasts, SIGMETs and PIREPs, runways, frequencies and ILS, plus ATIS read aloud. A 3D map shows airports, weather, the route and the flight track with its altitude profile; a flight plan can be built by hand, drawn on the map or imported from SimBrief.\n\nOpenTakeoff for Windows connects the phone to MSFS 2024 or X-Plane 11/12 over the local network (X-Plane without plugins), turning the phone into an extra panel: PFD and ND, engines, thrust levers, Airbus, Boeing, Garmin and KAP140-style autopilots, radios and aircraft systems. On the PC itself the program has instruments in six cockpit styles, an ECAM/EICAS engine display and a navigation map with VOR roses, a radial tool, precipitation radar and airport METARs coloured by flight category, plus a 3D view with a curtain under the track.\n\nEvery flight goes into a logbook synced with the phone: the track, charts, landing score and an analysis of the last 30 seconds before touchdown over the runway, from above and from the side, with a 3° path. Flights can be replayed on the map or in 3D with a chase camera. Statistics award achievements with levels and set two challenges every week – landing at a difficult airport and a technique task. For streamers: a landing card and a bar on the simulator screen, and the same pages as an OBS browser source. The program updates itself through redzikowski.com. No ads, accounts or API keys; Polish, English and Spanish.',
  role: 'Design, development and release',
  stack: pl.stack,
  features: [
    'airport weather: METAR, TAF, SIGMET, PIREP and ATIS read aloud',
    'mobile cockpit for MSFS 2024 and X-Plane 11/12',
    'Windows instruments: PFD, ND, ECAM/EICAS in six cockpit styles',
    'navigation map with precipitation radar, METARs and VOR radials',
    'logbook with landing analysis and 3D flight replay',
    'achievements, weekly challenges and OBS pages',
    'Android 8+, Windows 10 and 11 with automatic updates',
  ],
}

const exists = file => fs.access(file).then(() => true).catch(() => false)

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const projects = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
let found = false
const next = projects.map(project => {
  if (project?.slug !== 'opentakeoff') return project
  found = true
  return { ...project, ...pl, en: { ...(project.en || {}), ...en }, updatedAt: new Date().toISOString() }
})

if (found) {
  await fs.copyFile(projectsFile, path.join(dataDir, 'projects.before-opentakeoff-v56.json'))
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
  console.log('OpenTakeoff: opis Android + Windows (PL i EN)')
}
await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
