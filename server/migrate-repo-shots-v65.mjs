/**
 * Brakujące zrzuty ekranu z repozytoriów (docs/screenshots, te same co na plakatach) dopisane
 * na koniec galerii prac. Ekrany, które portfolio już pokazywało, zostały pominięte.
 * Angielskie opisy trafiają do `en.shotAlts` pod tym samym indeksem co zdjęcie.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-repo-shots-v65')

const SHOTS = {
  "openpdf": [
    { src: "/assets/portfolio/openpdf-android-01-czytanie.webp", alt: "OpenDocument – Czytanie (Android)", en: "OpenDocument – Reading (Android)" },
    { src: "/assets/portfolio/openpdf-android-02-adnotacje.webp", alt: "OpenDocument – Adnotacje (Android)", en: "OpenDocument – Annotations (Android)" },
    { src: "/assets/portfolio/openpdf-android-03-strony.webp", alt: "OpenDocument – Strony (Android)", en: "OpenDocument – Pages (Android)" },
    { src: "/assets/portfolio/openpdf-android-04-biblioteka.webp", alt: "OpenDocument – Biblioteka (Android)", en: "OpenDocument – Library (Android)" },
    { src: "/assets/portfolio/openpdf-windows-01-ksiazka.webp", alt: "OpenDocument – Tryb książki (Windows)", en: "OpenDocument – Book mode (Windows)" },
    { src: "/assets/portfolio/openpdf-windows-02-adnotacje.webp", alt: "OpenDocument – Zakreślenia, notatki i pióro (Windows)", en: "OpenDocument – Highlights, notes and pen (Windows)" },
    { src: "/assets/portfolio/openpdf-windows-03-raport.webp", alt: "OpenDocument – Dwie strony obok siebie (Windows)", en: "OpenDocument – Two pages side by side (Windows)" },
  ],
  "opencalc": [
    { src: "/assets/portfolio/opencalc-android-01-kalkulator.webp", alt: "OpenCalc – Kalkulator (Android)", en: "OpenCalc – Calculator (Android)" },
    { src: "/assets/portfolio/opencalc-android-02-wykresy.webp", alt: "OpenCalc – Wykresy (Android)", en: "OpenCalc – Graphs (Android)" },
    { src: "/assets/portfolio/opencalc-android-03-waluty.webp", alt: "OpenCalc – Waluty NBP (Android)", en: "OpenCalc – NBP exchange rates (Android)" },
    { src: "/assets/portfolio/opencalc-android-04-kredyt.webp", alt: "OpenCalc – Kredyt (Android)", en: "OpenCalc – Loan (Android)" },
  ],
  "open3dmaze": [
    { src: "/assets/portfolio/open3dmaze-android-01-menu.webp", alt: "Open3Dmaze – Tryby gry (Android)", en: "Open3Dmaze – Game modes (Android)" },
    { src: "/assets/portfolio/open3dmaze-android-02-gra.webp", alt: "Open3Dmaze – Kampania (Android)", en: "Open3Dmaze – Campaign (Android)" },
    { src: "/assets/portfolio/open3dmaze-android-03-wlasny.webp", alt: "Open3Dmaze – Własny labirynt (Android)", en: "Open3Dmaze – Custom maze (Android)" },
    { src: "/assets/portfolio/open3dmaze-android-04-pulapki.webp", alt: "Open3Dmaze – Pułapki (Android)", en: "Open3Dmaze – Traps (Android)" },
  ],
  "polskie-studio-map": [
    { src: "/assets/portfolio/polskie-studio-map-windows-01-teren.webp", alt: "Polskie Studio Map – Teren 3D z ortofotomapą GUGiK (Windows)", en: "Polskie Studio Map – 3D terrain with GUGiK orthophoto (Windows)" },
  ],
  "opentimer": [
    { src: "/assets/portfolio/opentimer-android-01-zegar.webp", alt: "OpenTimer – Zegar (Android)", en: "OpenTimer – Clock (Android)" },
    { src: "/assets/portfolio/opentimer-android-02-budzik.webp", alt: "OpenTimer – Budzik (Android)", en: "OpenTimer – Alarm (Android)" },
    { src: "/assets/portfolio/opentimer-android-03-stoper.webp", alt: "OpenTimer – Stoper (Android)", en: "OpenTimer – Stopwatch (Android)" },
    { src: "/assets/portfolio/opentimer-android-04-minutnik.webp", alt: "OpenTimer – Minutnik (Android)", en: "OpenTimer – Timer (Android)" },
  ],
  "openpayments": [
    { src: "/assets/portfolio/openpayments-android-01-start.webp", alt: "OpenPayments – Miesiąc (Android)", en: "OpenPayments – Month (Android)" },
    { src: "/assets/portfolio/openpayments-android-02-transakcje.webp", alt: "OpenPayments – Transakcje (Android)", en: "OpenPayments – Transactions (Android)" },
    { src: "/assets/portfolio/openpayments-android-03-budzety.webp", alt: "OpenPayments – Budżety (Android)", en: "OpenPayments – Budgets (Android)" },
    { src: "/assets/portfolio/openpayments-android-04-statystyki.webp", alt: "OpenPayments – Statystyki (Android)", en: "OpenPayments – Statistics (Android)" },
  ],
  "opentests": [
    { src: "/assets/portfolio/opentests-android-01-start.webp", alt: "OpenTests – Start (Android)", en: "OpenTests – Home (Android)" },
    { src: "/assets/portfolio/opentests-android-02-kreator.webp", alt: "OpenTests – Kreator (Android)", en: "OpenTests – Test builder (Android)" },
    { src: "/assets/portfolio/opentests-android-03-test.webp", alt: "OpenTests – Test (Android)", en: "OpenTests – Test (Android)" },
    { src: "/assets/portfolio/opentests-android-04-tablice.webp", alt: "OpenTests – Tablice (Android)", en: "OpenTests – Reference tables (Android)" },
  ],
  "openmp": [
    { src: "/assets/portfolio/openmp-windows-01-teraz.webp", alt: "OpenMP – Teraz odtwarzane (Windows)", en: "OpenMP – Now playing (Windows)" },
    { src: "/assets/portfolio/openmp-windows-02-tekst.webp", alt: "OpenMP – Tekst w rytm utworu (Windows)", en: "OpenMP – Lyrics in time with the song (Windows)" },
    { src: "/assets/portfolio/openmp-windows-03-lista.webp", alt: "OpenMP – Listy pogrupowane w albumy (Windows)", en: "OpenMP – Lists grouped by album (Windows)" },
  ],
  "opentakeoff": [
    { src: "/assets/portfolio/opentakeoff-android-01-lotniska.webp", alt: "OpenTakeoff – Lotniska (Android)", en: "OpenTakeoff – Airports (Android)" },
    { src: "/assets/portfolio/opentakeoff-android-02-odprawa.webp", alt: "OpenTakeoff – Odprawa przed lotem (Android)", en: "OpenTakeoff – Pre-flight briefing (Android)" },
    { src: "/assets/portfolio/opentakeoff-android-03-trasa.webp", alt: "OpenTakeoff – Trasa (Android)", en: "OpenTakeoff – Route (Android)" },
    { src: "/assets/portfolio/opentakeoff-android-04-checklista.webp", alt: "OpenTakeoff – Lista kontrolna (Android)", en: "OpenTakeoff – Checklist (Android)" },
    { src: "/assets/portfolio/opentakeoff-windows-01-mapa.webp", alt: "OpenTakeoff – Mapa na żywo (Windows)", en: "OpenTakeoff – Live map (Windows)" },
    { src: "/assets/portfolio/opentakeoff-windows-02-przyrzady.webp", alt: "OpenTakeoff – Przyrządy (Windows)", en: "OpenTakeoff – Instruments (Windows)" },
    { src: "/assets/portfolio/opentakeoff-windows-03-dziennik-3d.webp", alt: "OpenTakeoff – Dziennik lotu w 3D (Windows)", en: "OpenTakeoff – 3D flight log (Windows)" },
    { src: "/assets/portfolio/opentakeoff-windows-04-statystyki.webp", alt: "OpenTakeoff – Statystyki (Windows)", en: "OpenTakeoff – Statistics (Windows)" },
  ],
  "openshot": [
    { src: "/assets/portfolio/openshot-android-01-reczny.webp", alt: "OpenShot – Tryb ręczny (Android)", en: "OpenShot – Manual mode (Android)" },
    { src: "/assets/portfolio/openshot-android-02-dyktafon.webp", alt: "OpenShot – Dyktafon (Android)", en: "OpenShot – Voice recorder (Android)" },
    { src: "/assets/portfolio/openshot-android-03-wideo.webp", alt: "OpenShot – Wideo (Android)", en: "OpenShot – Video (Android)" },
    { src: "/assets/portfolio/openshot-android-05-nagrania.webp", alt: "OpenShot – Nagrania (Android)", en: "OpenShot – Recordings (Android)" },
  ],
  "opensms": [
    { src: "/assets/portfolio/opensms-android-01-rozmowy.webp", alt: "OpenSMS – Rozmowy (Android)", en: "OpenSMS – Conversations (Android)" },
    { src: "/assets/portfolio/opensms-android-02-rozmowa.webp", alt: "OpenSMS – Czat (Android)", en: "OpenSMS – Chat (Android)" },
    { src: "/assets/portfolio/opensms-android-03-filtr-spamu.webp", alt: "OpenSMS – Filtr spamu (Android)", en: "OpenSMS – Spam filter (Android)" },
    { src: "/assets/portfolio/opensms-android-04-ustawienia.webp", alt: "OpenSMS – Wygląd (Android)", en: "OpenSMS – Appearance (Android)" },
  ],
  "opencall": [
    { src: "/assets/portfolio/opencall-android-01-historia.webp", alt: "OpenDial – Historia (Android)", en: "OpenDial – Call history (Android)" },
    { src: "/assets/portfolio/opencall-android-02-klawiatura.webp", alt: "OpenDial – Klawiatura T9 (Android)", en: "OpenDial – T9 dial pad (Android)" },
    { src: "/assets/portfolio/opencall-android-03-kontakty.webp", alt: "OpenDial – Kontakty (Android)", en: "OpenDial – Contacts (Android)" },
    { src: "/assets/portfolio/opencall-android-04-kontakt.webp", alt: "OpenDial – Karta kontaktu (Android)", en: "OpenDial – Contact card (Android)" },
  ],
  "openamp": [
    { src: "/assets/portfolio/openamp-android-01-odtwarzacz.webp", alt: "OpenAMP – Odtwarzacz (Android)", en: "OpenAMP – Player (Android)" },
    { src: "/assets/portfolio/openamp-android-02-biblioteka.webp", alt: "OpenAMP – Biblioteka (Android)", en: "OpenAMP – Library (Android)" },
    { src: "/assets/portfolio/openamp-android-03-korektor.webp", alt: "OpenAMP – Korektor (Android)", en: "OpenAMP – Equalizer (Android)" },
    { src: "/assets/portfolio/openamp-android-04-kolejka.webp", alt: "OpenAMP – Kolejka (Android)", en: "OpenAMP – Queue (Android)" },
  ],
  "musictagger": [
    { src: "/assets/portfolio/musictagger-android-01-biblioteka.webp", alt: "OpenMusicTagger – Biblioteka (Android)", en: "OpenMusicTagger – Library (Android)" },
    { src: "/assets/portfolio/musictagger-android-02-okladki.webp", alt: "OpenMusicTagger – Albumy (Android)", en: "OpenMusicTagger – Albums (Android)" },
    { src: "/assets/portfolio/musictagger-android-03-tagi.webp", alt: "OpenMusicTagger – Tagi (Android)", en: "OpenMusicTagger – Tags (Android)" },
    { src: "/assets/portfolio/musictagger-android-04-okladka.webp", alt: "OpenMusicTagger – Okładka (Android)", en: "OpenMusicTagger – Cover art (Android)" },
    { src: "/assets/portfolio/musictagger-windows-01-biblioteka.webp", alt: "OpenMusicTagger – Biblioteka i edytor tagów (Windows)", en: "OpenMusicTagger – Library and tag editor (Windows)" },
    { src: "/assets/portfolio/musictagger-windows-02-okladka.webp", alt: "OpenMusicTagger – Okładka w pliku (Windows)", en: "OpenMusicTagger – Cover art embedded in the file (Windows)" },
    { src: "/assets/portfolio/musictagger-windows-03-braki.webp", alt: "OpenMusicTagger – Braki na pierwszy rzut oka (Windows)", en: "OpenMusicTagger – Missing tags at a glance (Windows)" },
  ],
  "openmeter": [
    { src: "/assets/portfolio/openmeter-android-01-mierniki.webp", alt: "OpenMeter – Mierniki (Android)", en: "OpenMeter – Meters (Android)" },
    { src: "/assets/portfolio/openmeter-android-02-poziomica.webp", alt: "OpenMeter – Poziomica (Android)", en: "OpenMeter – Spirit level (Android)" },
    { src: "/assets/portfolio/openmeter-android-03-kompas.webp", alt: "OpenMeter – Kompas (Android)", en: "OpenMeter – Compass (Android)" },
    { src: "/assets/portfolio/openmeter-android-04-luksomierz.webp", alt: "OpenMeter – Luksomierz (Android)", en: "OpenMeter – Light meter (Android)" },
  ],
  "openpfd": [
    { src: "/assets/portfolio/openpfd-android-02-g1000.webp", alt: "OpenPFD – Garmin G1000 (Android)", en: "OpenPFD – Garmin G1000 (Android)" },
    { src: "/assets/portfolio/openpfd-android-03-787.webp", alt: "OpenPFD – Boeing 787 (Android)", en: "OpenPFD – Boeing 787 (Android)" },
    { src: "/assets/portfolio/openpfd-android-04-wybor.webp", alt: "OpenPFD – Przyrządy (Android)", en: "OpenPFD – Instruments (Android)" },
  ],
  "openroutine": [
    { src: "/assets/portfolio/openroutine-android-01-rutyny.webp", alt: "OpenRoutine – Rutyny (Android)", en: "OpenRoutine – Routines (Android)" },
    { src: "/assets/portfolio/openroutine-android-02-edytor.webp", alt: "OpenRoutine – Edytor (Android)", en: "OpenRoutine – Editor (Android)" },
    { src: "/assets/portfolio/openroutine-android-03-szablony.webp", alt: "OpenRoutine – Szablony (Android)", en: "OpenRoutine – Templates (Android)" },
    { src: "/assets/portfolio/openroutine-android-04-wyzwalacze.webp", alt: "OpenRoutine – Wyzwalacze (Android)", en: "OpenRoutine – Triggers (Android)" },
    { src: "/assets/portfolio/openroutine-windows-01-szablony.webp", alt: "OpenRoutine – 85 gotowych szablonów (Windows)", en: "OpenRoutine – 85 ready-made templates (Windows)" },
    { src: "/assets/portfolio/openroutine-windows-02-podglad.webp", alt: "OpenRoutine – Gdy… wykonaj… (Windows)", en: "OpenRoutine – When… do… (Windows)" },
    { src: "/assets/portfolio/openroutine-windows-03-ustawienia.webp", alt: "OpenRoutine – Lokalny serwer HTTP i CLI (Windows)", en: "OpenRoutine – Local HTTP server and CLI (Windows)" },
  ],
  "openexplorer": [
    { src: "/assets/portfolio/openexplorer-android-01-strona.webp", alt: "OpenExplorer – Przeglądanie (Android)", en: "OpenExplorer – Browsing (Android)" },
    { src: "/assets/portfolio/openexplorer-android-02-karty.webp", alt: "OpenExplorer – Karty (Android)", en: "OpenExplorer – Tabs (Android)" },
    { src: "/assets/portfolio/openexplorer-android-03-menu.webp", alt: "OpenExplorer – Szybkie menu (Android)", en: "OpenExplorer – Quick menu (Android)" },
    { src: "/assets/portfolio/openexplorer-android-04-prywatnosc.webp", alt: "OpenExplorer – Prywatność (Android)", en: "OpenExplorer – Privacy (Android)" },
  ],
  "openfilepower": [
    { src: "/assets/portfolio/openfilepower-android-01-start.webp", alt: "OpenFilePower – Start (Android)", en: "OpenFilePower – Home (Android)" },
    { src: "/assets/portfolio/openfilepower-android-02-galeria.webp", alt: "OpenFilePower – Galeria (Android)", en: "OpenFilePower – Gallery (Android)" },
    { src: "/assets/portfolio/openfilepower-android-03-foldery.webp", alt: "OpenFilePower – Karty folderów (Android)", en: "OpenFilePower – Folder tabs (Android)" },
  ],
  "open360": [
    { src: "/assets/portfolio/open360-android-02-perspektywa.webp", alt: "Open360 – Perspektywa (Android)", en: "Open360 – Perspective (Android)" },
    { src: "/assets/portfolio/open360-android-03-mala-planeta.webp", alt: "Open360 – Mała planeta (Android)", en: "Open360 – Little planet (Android)" },
    { src: "/assets/portfolio/open360-android-04-tunel.webp", alt: "Open360 – Tunel (Android)", en: "Open360 – Tunnel (Android)" },
  ],
  "opentracetrack": [
    { src: "/assets/portfolio/opentracetrack-android-02-przesiadka.webp", alt: "OpenTraceTrack – Przesiadki (Android)", en: "OpenTraceTrack – Transfers (Android)" },
    { src: "/assets/portfolio/opentracetrack-android-03-trasy.webp", alt: "OpenTraceTrack – Trasy (Android)", en: "OpenTraceTrack – Routes (Android)" },
    { src: "/assets/portfolio/opentracetrack-android-04-statystyki.webp", alt: "OpenTraceTrack – Statystyki (Android)", en: "OpenTraceTrack – Statistics (Android)" },
  ],
  "openclipflow": [
    { src: "/assets/portfolio/openclipflow-android-01-montaz.webp", alt: "OpenClipFlow – Oś czasu (Android)", en: "OpenClipFlow – Timeline (Android)" },
    { src: "/assets/portfolio/openclipflow-android-02-eksport.webp", alt: "OpenClipFlow – Eksport (Android)", en: "OpenClipFlow – Export (Android)" },
  ],
  "opendesktop": [
    { src: "/assets/portfolio/opendesktop-android-02-szuflada.webp", alt: "OpenDesktop – Kategorie (Android)", en: "OpenDesktop – Categories (Android)" },
    { src: "/assets/portfolio/opendesktop-android-03-style.webp", alt: "OpenDesktop – Style szuflady (Android)", en: "OpenDesktop – App drawer styles (Android)" },
    { src: "/assets/portfolio/opendesktop-android-04-kula.webp", alt: "OpenDesktop – Kula 3D (Android)", en: "OpenDesktop – 3D sphere (Android)" },
  ],
  "openkeyboard": [
    { src: "/assets/portfolio/openkeyboard-android-01-pisanie.webp", alt: "OpenKeyboard – Podpowiedzi (Android)", en: "OpenKeyboard – Suggestions (Android)" },
    { src: "/assets/portfolio/openkeyboard-android-02-emoji.webp", alt: "OpenKeyboard – Emoji (Android)", en: "OpenKeyboard – Emoji (Android)" },
    { src: "/assets/portfolio/openkeyboard-android-03-motywy.webp", alt: "OpenKeyboard – Motywy (Android)", en: "OpenKeyboard – Themes (Android)" },
    { src: "/assets/portfolio/openkeyboard-android-04-jezyki.webp", alt: "OpenKeyboard – Języki (Android)", en: "OpenKeyboard – Languages (Android)" },
  ],
  "openmail": [
    { src: "/assets/portfolio/openmail-android-01-odebrane.webp", alt: "OpenMail – Odebrane (Android)", en: "OpenMail – Inbox (Android)" },
    { src: "/assets/portfolio/openmail-android-02-wiadomosc.webp", alt: "OpenMail – Wiadomość (Android)", en: "OpenMail – Message (Android)" },
    { src: "/assets/portfolio/openmail-android-03-pisanie.webp", alt: "OpenMail – Pisanie (Android)", en: "OpenMail – Compose (Android)" },
  ],
  "opensync": [
    { src: "/assets/portfolio/opensync-android-02-zadanie.webp", alt: "OpenSync – Co kopiować (Android)", en: "OpenSync – What to back up (Android)" },
    { src: "/assets/portfolio/opensync-android-04-przywracanie.webp", alt: "OpenSync – Przywracanie (Android)", en: "OpenSync – Restore (Android)" },
  ],
  "openpano": [
    { src: "/assets/portfolio/openpano-windows-01-panorama.webp", alt: "OpenPano – Pięć kadrów, jedna panorama (Windows)", en: "OpenPano – Five frames, one panorama (Windows)" },
    { src: "/assets/portfolio/openpano-windows-02-kadry.webp", alt: "OpenPano – Obrysy dopasowanych zdjęć (Windows)", en: "OpenPano – Outlines of matched photos (Windows)" },
    { src: "/assets/portfolio/openpano-windows-03-zdjecia.webp", alt: "OpenPano – Jakość 100/100, błąd 0,6 px (Windows)", en: "OpenPano – Quality 100/100, 0.6 px error (Windows)" },
  ],
  "openaudiopower": [
    { src: "/assets/portfolio/openaudiopower-windows-01-sciezki.webp", alt: "OpenAudioPower – Sześć ścieżek z jednego utworu (Windows)", en: "OpenAudioPower – Six stems from one song (Windows)" },
    { src: "/assets/portfolio/openaudiopower-windows-02-separacja.webp", alt: "OpenAudioPower – Separacja HT-Demucs (Windows)", en: "OpenAudioPower – HT-Demucs separation (Windows)" },
    { src: "/assets/portfolio/openaudiopower-windows-03-analizator.webp", alt: "OpenAudioPower – Analizator widma (Windows)", en: "OpenAudioPower – Spectrum analyser (Windows)" },
  ],
  "muszejechac": [
    { src: "/assets/portfolio/muszejechac-android-01-start.webp", alt: "MuszęJechać – Start (Android)", en: "MuszęJechać – Home (Android)" },
    { src: "/assets/portfolio/muszejechac-android-02-mapa.webp", alt: "MuszęJechać – Pojazdy na żywo (Android)", en: "MuszęJechać – Live vehicles (Android)" },
    { src: "/assets/portfolio/muszejechac-android-03-polaczenia.webp", alt: "MuszęJechać – Połączenia (Android)", en: "MuszęJechać – Connections (Android)" },
    { src: "/assets/portfolio/muszejechac-android-04-statystyki.webp", alt: "MuszęJechać – Statystyki (Android)", en: "MuszęJechać – Statistics (Android)" },
  ],
  "openlyrics": [
    { src: "/assets/portfolio/openlyrics-android-01-nakladka.webp", alt: "OpenLyrics – Nakładka (Android)", en: "OpenLyrics – Overlay (Android)" },
    { src: "/assets/portfolio/openlyrics-android-02-teraz.webp", alt: "OpenLyrics – Teraz gra (Android)", en: "OpenLyrics – Now playing (Android)" },
    { src: "/assets/portfolio/openlyrics-android-03-wyglad.webp", alt: "OpenLyrics – Wygląd (Android)", en: "OpenLyrics – Appearance (Android)" },
    { src: "/assets/portfolio/openlyrics-windows-01-teraz.webp", alt: "OpenLyrics – Teraz odtwarzane i podgląd (Windows)", en: "OpenLyrics – Now playing and preview (Windows)" },
    { src: "/assets/portfolio/openlyrics-windows-02-nakladka.webp", alt: "OpenLyrics – Nakładka nad wszystkimi oknami (Windows)", en: "OpenLyrics – Overlay above all windows (Windows)" },
    { src: "/assets/portfolio/openlyrics-windows-03-przesuniecie.webp", alt: "OpenLyrics – Przesunięcie czasu dla utworu (Windows)", en: "OpenLyrics – Per-song time offset (Windows)" },
  ],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
let added = 0
const next = current.map(item => {
  const extra = SHOTS[item?.slug]
  if (!extra) return item
  const shots = (Array.isArray(item.shots) ? item.shots : []).filter(shot => !shot.poster)
  const known = new Set(shots.map(shot => shot.src))
  const fresh = extra.filter(shot => !known.has(shot.src))
  if (!fresh.length) return item
  added += fresh.length
  const alts = Array.isArray(item.en?.shotAlts) ? item.en.shotAlts.slice(0, shots.length) : []
  while (alts.length < shots.length) alts.push('')
  return {
    ...item,
    cover: item.cover || fresh[0].src,
    shots: [...shots, ...fresh.map(({ src, alt }) => ({ src, alt }))].slice(0, 24),
    ...(item.en ? { en: { ...item.en, shotAlts: [...alts, ...fresh.map(shot => shot.en)].slice(0, 24) } } : {}),
    updatedAt: new Date().toISOString(),
  }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Dopisane zrzuty z repozytoriów: ${added}.`)
