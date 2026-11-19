/**
 * Dodaje FS Opendata Scenery (generator scenerii MSFS 2024 z otwartych danych) do portfolio,
 * zaraz za FS Addon Toolkit.
 *
 * Plik do pobrania pochodzi z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Wpis z `repo` uruchamia też adres
 * `/api/releases/repos/BlackSingularities/FSOpendataScenery/releases/latest`, z którego aplikacja
 * sprawdza aktualizacje, oraz `/api/projects/fsopendatascenery/asset/…` do ich pobierania.
 * Zgłoszenia z aplikacji przychodzą z `app: 'fsopendatascenery'`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-fsopendatascenery-v63')

const project = {
  id: 'prj-fsopendatascenery',
  slug: 'fsopendatascenery',
  name: 'FS Opendata Scenery',
  kind: 'app',
  label: 'Generator scenerii MSFS 2024 / Windows',
  year: '2026',
  tagline: 'Twoja okolica w Microsoft Flight Simulator 2024 – dokładniejsza rzeźba terenu i oświetlenie jak naprawdę, z otwartych danych.',
  summary: 'Wyznaczasz obszar na mapie, a aplikacja pobiera darmowe dane wysokościowe i OpenStreetMap, liczy rzeźbę terenu, rozstawia prawdziwe latarnie ze światłem skierowanym w dół, dodaje światła przeszkodowe i latarnie morskie, usuwa drzewa z dróg i wód, a na koniec buduje gotowy pakiet do folderu Community.',
  body: 'Teren powstaje z kilku źródeł naraz, a w każdym punkcie wygrywa pierwsze, które ma dane: numeryczny model terenu GUGiK 1 m z LiDAR dla całej Polski, AWS Terrain Tiles i Copernicus dla reszty świata albo własne pliki GeoTIFF, ASC, XYZ i HGT. Aplikacja sama przelicza układy współrzędnych – od PL-1992 i PL-2000, przez UTM, po szwajcarskie LV95, holenderskie RD i brytyjski National Grid – i dzieli obszar na prostokąty z heightmapą bez szwów, z wygładzaniem, łagodnym przejściem do terenu symulatora i spłaszczonymi jeziorami.\n\nOświetlenie bierze się z OpenStreetMap: prawdziwe latarnie z wysokością, sposobem mocowania i barwą z tagów, z wysięgnikiem obróconym nad jezdnię, a do tego oświetlone ulice, ścieżki, parkingi, boiska z naświetlaczami skierowanymi na płytę, perony i stacje paliw. Lampy to proceduralne modele 3D ze światłem padającym w dół, przyklejone do terenu – także do nowej rzeźby. Maszty, kominy i turbiny wiatrowe dostają światła przeszkodowe, a latarnie morskie prawdziwy rytm błysków.\n\nPakiet kompiluje oficjalne narzędzie MSFS 2024 SDK, a aplikacja instaluje go w Community jednym kliknięciem. Przed budowaniem całość widać na mapie i w podglądzie 3D nocą i w dzień. Interfejs po polsku i angielsku; aktualizacje i zgłoszenia przychodzą przez redzikowski.com. Napisana w Ruście z Tauri.',
  role: 'Projekt, przetwarzanie danych wysokościowych i OSM, modele 3D, interfejs i wydania',
  stack: ['Rust', 'Tauri', 'JavaScript', 'Leaflet', 'three.js', 'glTF', 'MSFS 2024 SDK'],
  features: [
    'rzeźba terenu z NMT GUGiK 1 m, Copernicus i AWS Terrain Tiles',
    'własne pliki LiDAR: GeoTIFF, ASC, XYZ, HGT',
    'latarnie i oświetlenie z OpenStreetMap, światło w dół',
    'światła przeszkodowe, latarnie morskie, wycinka drzew',
    'podgląd 3D nocą i w dzień',
    'kompilacja przez MSFS 2024 SDK i instalacja w Community',
  ],
  icon: '/assets/portfolio/fsopendatascenery-icon.png',
  cover: '',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/FSOpendataScenery',
  repoHidden: false,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 0,
  category: 'UtilitiesApplication',
  seoTitle: 'FS Opendata Scenery – sceneria MSFS 2024 z otwartych danych',
  seoDescription: 'Dokładniejsza rzeźba terenu z NMT 1 m i prawdziwe oświetlenie z OpenStreetMap do Microsoft Flight Simulator 2024. Pakiet do folderu Community jednym kliknięciem.',
  keywords: ['sceneria MSFS 2024', 'MSFS 2024 teren', 'NMT do MSFS', 'oświetlenie ulic MSFS', 'OpenStreetMap MSFS', 'folder Community'],
  faq: [
    { q: 'Skąd aplikacja bierze dane wysokościowe?', a: 'W Polsce z numerycznego modelu terenu GUGiK o rozdzielczości 1 m, na świecie z AWS Terrain Tiles i Copernicus. Można też dodać własne pliki LiDAR.' },
    { q: 'Czy potrzebuję MSFS 2024 SDK?', a: 'Do skompilowania pakietu tak – SDK jest darmowe i instaluje się z trybu deweloperskiego symulatora. Bez niego aplikacja zapisuje kompletne źródła projektu.' },
    { q: 'Skąd biorą się latarnie?', a: 'Z OpenStreetMap: prawdziwe lampy z mapy oraz oświetlone drogi, parkingi, boiska i perony, z wysokością, barwą i kierunkiem.' },
  ],
  en: {
    label: 'MSFS 2024 scenery generator / Windows',
    tagline: 'Your area in Microsoft Flight Simulator 2024 – more accurate terrain and real-world lighting, from open data.',
    summary: 'Draw an area on the map and the app downloads free elevation data and OpenStreetMap, computes the terrain, places real street lamps with light pointing down, adds obstruction lights and lighthouses, clears trees from roads and water, and builds a ready package for the Community folder.',
    body: 'Terrain is built from several sources at once and at each point the first one with data wins: the 1 m LiDAR terrain model from GUGiK for all of Poland, AWS Terrain Tiles and Copernicus for the rest of the world, or your own GeoTIFF, ASC, XYZ and HGT files. The app converts coordinate systems itself – from the Polish grids and UTM to Swiss LV95, Dutch RD and the British National Grid – and splits the area into seamless height-map rectangles with smoothing, a gentle blend into the simulator terrain and flattened lakes.\n\nLighting comes from OpenStreetMap: real street lamps with height, mounting and colour from their tags and the arm turned over the road, plus lit streets, paths, car parks, pitches with floodlights aimed at the field, platforms and fuel stations. Lamps are procedural 3D models with light falling downward, glued to the ground – including the new terrain. Masts, chimneys and wind turbines get obstruction lights and lighthouses their real flash pattern.\n\nThe package is compiled by the official MSFS 2024 SDK tool and installed into Community with one click. Before building you can check everything on the map and in a 3D preview by night and by day. Interface in Polish and English; updates and feedback go through redzikowski.com. Written in Rust with Tauri.',
    role: 'Design, elevation and OSM processing, 3D models, interface and releases',
    features: [
      'terrain from GUGiK 1 m DTM, Copernicus and AWS Terrain Tiles',
      'your own LiDAR: GeoTIFF, ASC, XYZ, HGT',
      'street lighting from OpenStreetMap, light pointing down',
      'obstruction lights, lighthouses, tree removal',
      '3D preview by night and by day',
      'compiled with the MSFS 2024 SDK and installed into Community',
    ],
    seoTitle: 'FS Opendata Scenery – MSFS 2024 scenery from open data',
    seoDescription: 'More accurate terrain from 1 m DTMs and real-world lighting from OpenStreetMap for Microsoft Flight Simulator 2024. A Community folder package in one click.',
    keywords: ['MSFS 2024 scenery', 'MSFS 2024 terrain', 'DEM to MSFS', 'MSFS street lights', 'OpenStreetMap MSFS', 'Community folder'],
    faq: [
      { q: 'Where does the elevation data come from?', a: 'In Poland from the GUGiK 1 m terrain model, worldwide from AWS Terrain Tiles and Copernicus. You can also add your own LiDAR files.' },
      { q: 'Do I need the MSFS 2024 SDK?', a: 'To compile the package, yes – the SDK is free and installs from the simulator developer mode. Without it the app saves complete project sources.' },
      { q: 'Where do the street lamps come from?', a: 'From OpenStreetMap: real lamps from the map plus lit roads, car parks, pitches and platforms, with height, colour and direction.' },
    ],
  },
}

function isScenery(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.name === project.name
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isScenery)
const rest = current.filter(item => !isScenery(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Obie aplikacje do MSFS stoją obok siebie.
const anchor = ['fsaddontoolkit', 'openspacecraft', 'gran-3d'].map(slug => rest.findIndex(item => item.slug === slug)).find(i => i !== -1)
const at = anchor !== undefined ? anchor + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`FS Opendata Scenery w portfolio na pozycji ${at + 1} z ${next.length}.`)
