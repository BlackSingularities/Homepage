/**
 * Dodaje Podróżownik (Travels 2.0) do portfolio, zaraz za Kompendium Podróży.
 *
 * Publiczna kopia działa pod /travels/ na tym samym serwerze, z własną bazą
 * i trybem demo. Repozytorium jest prywatne, więc link do niego zostaje ukryty.
 * Zrzuty pochodzą z trybu demo, nie z prywatnych danych.
 *
 * Nie nadpisuje wpisu, jeśli ktoś już dodał go w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-travels-v25')

const SHOTS = [
  ['travels-01-pulpit', 'Pulpit z podróżami: trasa na mapie, czas, kilometry i koszty każdego wyjazdu', 'Dashboard with trips: route on a map, duration, distance and cost of each one'],
  ['travels-02-podroz', 'Podróż do Japonii: przebieg, kalendarz, podsumowanie kosztów i plan dzień po dniu', 'A trip to Japan: route, calendar, cost summary and a day-by-day plan'],
  ['travels-03-os', 'Oś podróży z noclegami, przejazdami i wydatkami na kolejnych dniach', 'Trip timeline with stays, journeys and expenses across the days'],
  ['travels-04-mapa', 'Mapa świata ze wszystkimi trasami, filtrowana według środka transportu', 'World map with every route, filtered by means of transport'],
  ['travels-05-wydatki', 'Wydatki pogrupowane na transport, noclegi, jedzenie i zakupy', 'Expenses grouped into transport, stays, food and shopping'],
  ['travels-06-kraje', 'Odwiedzone kraje z flagami, liczbą podróży i dni', 'Visited countries with flags, number of trips and days'],
]

const project = {
  id: 'prj-travels',
  slug: 'podrozownik',
  name: 'Podróżownik',
  kind: 'web',
  label: 'Dziennik i planer podróży',
  year: '2026',
  tagline: 'Cała podróż w jednym miejscu: plan dnia, mapa, transport, ślady GPX, noclegi, wydatki i zdjęcia.',
  summary: 'Aplikacja do zapisywania tego, co było, i planowania tego, co będzie. Każda podróż ma swoją trasę, oś dni, koszty i zdjęcia, a wszystkie razem składają się na mapę świata i statystyki.',
  body: 'Każda podróż zbiera loty, przejazdy samochodem, pociągi, autobusy i promy, noclegi, atrakcje, pamiątki, wydatki i zdjęcia. Z nich powstaje widok podróży: trasa na mapie, kalendarz, podsumowanie kosztów w podziale na kategorie i plan dzień po dniu na osi czasu.\n\nPrzejazdy można uzupełnić śladem GPX – dystans i punkty końcowe liczą się wtedy z samego śladu. Mapa świata pokazuje wszystkie trasy naraz z filtrami według środka transportu, a lista krajów zlicza podróże i dni spędzone w każdym z nich.\n\nDane wprowadza się w klasycznym edytorze albo przez edytor AI: opisujesz wyjazd lub wrzucasz bilety i potwierdzenia rezerwacji, a model przygotowuje zmiany do przejrzenia i zatwierdzenia pole po polu. Generator planów układa propozycje kolejnych wyjazdów.\n\nFrontend to React 19 z TypeScriptem, React Query, Zustand i mapami Leaflet, backend – FastAPI na SQLite. Zdjęcia, bilety i ślady GPX idą przez podpisane, wygasające adresy. Bez konta aplikacja działa w trybie demo z przykładowymi podróżami.',
  role: 'Projekt, architektura, implementacja i wdrożenie',
  stack: ['React', 'TypeScript', 'Vite', 'Leaflet', 'FastAPI', 'SQLite', 'Docker'],
  features: [
    'oś podróży dzień po dniu z kalendarzem',
    'mapa świata ze wszystkimi trasami',
    'transport, noclegi i ślady GPX',
    'wydatki w podziale na kategorie',
    'edytor AI z przeglądem zmian',
    'tryb demo bez zakładania konta',
  ],
  icon: '',
  cover: '/assets/portfolio/travels-cover.webp',
  shots: SHOTS.map(([name, alt]) => ({ src: `/assets/portfolio/${name}.webp`, alt })),
  siteUrl: '/travels/',
  siteHidden: false,
  repo: 'BlackSingularities/Travels-2.0',
  repoHidden: true,
  releaseSource: 'none',
  stores: {},
  downloads: [],
  en: {
    label: 'Travel journal & planner',
    tagline: 'The whole trip in one place: daily plan, map, transport, GPX tracks, stays, expenses and photos.',
    summary: 'An app for recording where you have been and planning where you are going. Every trip has its own route, day timeline, costs and photos, and together they add up to a world map and statistics.',
    body: 'Each trip collects flights, car journeys, trains, buses and ferries, stays, attractions, souvenirs, expenses and photos. From them comes the trip view: the route on a map, a calendar, a cost summary by category and a day-by-day plan on a timeline.\n\nJourneys can be completed with a GPX track – distance and endpoints are then computed from the track itself. The world map shows every route at once with filters by means of transport, and the country list counts trips and days spent in each.\n\nData goes in through a classic editor or the AI editor: describe the trip or drop in tickets and booking confirmations, and the model prepares changes to review and accept field by field. A plan generator suggests future trips.\n\nThe frontend is React 19 with TypeScript, React Query, Zustand and Leaflet maps; the backend is FastAPI on SQLite. Photos, tickets and GPX tracks are served through signed, expiring URLs. Without an account the app runs in demo mode with sample trips.',
    role: 'Design, architecture, implementation and deployment',
    features: [
      'day-by-day trip timeline with a calendar',
      'world map with every route',
      'transport, stays and GPX tracks',
      'expenses by category',
      'AI editor with change review',
      'demo mode without signing up',
    ],
    shotAlts: SHOTS.map(([, , alt]) => alt),
  },
  published: true,
  featured: false,
}

function isTravels(item) {
  return item?.id === project.id
    || item?.slug === project.slug
    || String(item?.repo || '').toLowerCase() === project.repo.toLowerCase()
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []

if (!current.some(isTravels)) {
  const now = new Date().toISOString()
  const anchor = current.findIndex(item => item?.slug === 'kompendium-podrozy')
  const at = anchor === -1 ? current.length : anchor + 1
  const next = [...current.slice(0, at), { ...project, createdAt: now, updatedAt: now }, ...current.slice(at)]
    .map((item, index) => ({ ...item, order: index }))
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
  console.log(`Podróżownik w portfolio na pozycji ${at + 1} z ${next.length}.`)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
