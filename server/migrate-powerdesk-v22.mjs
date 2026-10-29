/**
 * Dodaje PowerDesk do portfolio, tuż przed
 * OpenFilePower, który zastępuje. Pliki do pobrania i aktualizacje w programie
 * idą z najnowszego wydania przez serwer portfolio (`releaseSource: 'github'`).
 *
 * Nie nadpisuje wpisu, jeśli ktoś już dodał go w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-powerdesk-v22')

const project = {
  id: 'prj-powerdesk',
  slug: 'powerdesk',
  name: 'PowerDesk',
  kind: 'app',
  label: 'Powłoka i menedżer plików / Windows',
  year: '2026',
  tagline: 'Pulpit, pasek zadań, menu Start i menedżer plików dla Windows 10 i 11 w jednym natywnym programie.',
  summary: 'Zamiennik Eksploratora Windows napisany w Rust i Slint: menedżer plików z kartami i dwoma panelami, własny pulpit z widżetami, pasek zadań, menu Start i nakładka z licznikiem klatek – bez przeglądarki w środku i bez uprawnień administratora.',
  body: 'Menedżer plików ma karty i dwa panele, widok listy, siatki i galerii oraz podgląd zdjęć, wideo, PDF-ów, dokumentów, kodu, SVG, czcionek, modeli 3D i Markdown. Kopiowanie i przenoszenie idą w tle z możliwością cofnięcia, a do tego archiwa, porównywanie folderów, synchronizacja, analiza zajętego miejsca i wbudowany terminal.\n\nPulpit obsługuje ikony, tapety z Windows, pokaz slajdów i zdjęcie dnia, widżety oraz strefy okien przy przeciąganiu z Shiftem. Pasek zadań pokazuje okna z podglądami, przypięte programy, zasobnik z siecią, głośnością i baterią, centrum powiadomień i kalendarz. Menu Start wyszukuje aplikacje, pliki i ustawienia, liczy z jednostkami i układa kafelki w grupy i foldery.\n\nNakładka pod Alt+R pokazuje FPS i czas klatki dowolnego programu na podstawie zdarzeń systemowych Windows, bez wstrzykiwania kodu, a obok obciążenie procesora, karty graficznej i pamięci.\n\nPowerDesk może zastąpić Eksplorator jako powłokę po zalogowaniu. Strażnik przywraca pulpit i pasek Windows po awarii, a Shift przy logowaniu otwiera zwykłą sesję z Eksploratorem. Program instaluje się dla bieżącego użytkownika i sam się aktualizuje.',
  role: 'Projekt, architektura, implementacja i wydania',
  stack: ['Rust', 'Slint', 'Win32'],
  features: [
    'menedżer plików z kartami, dwoma panelami i podglądem',
    'pulpit z widżetami, pasek zadań i menu Start',
    'nakładka FPS i obciążenia pod Alt+R',
    'może zastąpić Eksplorator jako powłokę systemu',
    'Windows 10 lub 11, instalacja bez uprawnień administratora',
  ],
  en: {
    label: 'Shell & file manager / Windows',
    tagline: 'Desktop, taskbar, Start menu and file manager for Windows 10 and 11 in one native program.',
    summary: 'A Windows Explorer replacement written in Rust and Slint: a file manager with tabs and dual panes, its own desktop with widgets, a taskbar, a Start menu and an FPS overlay – no browser inside and no administrator rights needed.',
    body: 'The file manager has tabs and dual panes, list, grid and gallery views, and previews for photos, video, PDFs, documents, code, SVG, fonts, 3D models and Markdown. Copying and moving run in the background with undo, plus archives, folder comparison, sync, disk usage analysis and a built-in terminal.\n\nThe desktop supports icons, Windows wallpapers, slideshows and a picture of the day, widgets, and window snap zones when dragging with Shift. The taskbar shows windows with previews, pinned programs, a tray with network, volume and battery, a notification centre and a calendar. The Start menu searches apps, files and settings, calculates with units and arranges tiles into groups and folders.\n\nThe Alt+R overlay shows the FPS and frame time of any program using Windows system events, without injecting code, alongside CPU, GPU and memory load.\n\nPowerDesk can replace Explorer as the shell after sign-in. A watchdog restores the Windows desktop and taskbar after a crash, and holding Shift at sign-in opens a regular Explorer session. It installs for the current user and updates itself.',
    features: [
      'file manager with tabs, dual panes and previews',
      'desktop with widgets, taskbar and Start menu',
      'FPS and load overlay on Alt+R',
      'can replace Explorer as the system shell',
      'Windows 10 or 11, installs without administrator rights',
    ],
  },
  cover: '',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/PowerDesk',
  repoHidden: false,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: false,
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
const repo = project.repo.toLowerCase()

if (!current.some(item => item?.slug === project.slug || String(item?.repo || '').toLowerCase() === repo)) {
  const now = new Date().toISOString()
  const at = current.findIndex(item => item?.slug === 'openfilepower')
  const index = at < 0 ? current.length : at
  const next = [...current]
  next.splice(index, 0, { ...project, order: current[index]?.order ?? index, createdAt: now, updatedAt: now })
  // Kolejność w panelu bierze się z pola `order` – przenumerowujemy całą listę.
  next.forEach((item, position) => { item.order = position })
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
  console.log('Dodano PowerDesk do portfolio.')
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
