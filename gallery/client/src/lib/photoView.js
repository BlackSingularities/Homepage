import { useMemo, useState } from 'react'

/**
 * Kolejność i zawężenie zbioru zdjęć – wszystko po stronie przeglądarki, na
 * liście, która i tak jest już pobrana. Rok i aparat czytamy z danych EXIF,
 * więc filtry same znikają, gdy zdjęcia ich nie niosą.
 */

const takenYear = photo => {
  const date = photo.taken_at || photo.created_at
  return date ? String(new Date(date).getFullYear()) : ''
}

const cameraOf = photo => [photo.camera_make, photo.camera_model].filter(Boolean).join(' ').trim()

const tally = (photos, pick) => {
  const map = new Map()
  for (const photo of photos) {
    const key = pick(photo)
    if (!key) continue
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0], 'pl'))
}

/** Zapamiętany wybór czytelnika; prywatne okno po prostu go nie zapisze. */
function stored(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}

export function usePhotoView(photos, storageKey) {
  const [sort, setSort] = useState('newest')
  const [year, setYear] = useState('')
  const [camera, setCamera] = useState('')
  const [layout, setLayoutState] = useState(() => stored(`${storageKey}_layout`, 'masonry'))
  const [tileSize, setTileSizeState] = useState(() => stored(`${storageKey}_tile`, 'medium'))

  const remember = (key, value) => { try { localStorage.setItem(key, value) } catch { /* brak dostępu do pamięci */ } }
  const setLayout = value => { setLayoutState(value); remember(`${storageKey}_layout`, value) }
  const setTileSize = value => { setTileSizeState(value); remember(`${storageKey}_tile`, value) }

  const years = useMemo(() => tally(photos, takenYear), [photos])
  const cameras = useMemo(() => tally(photos, cameraOf).sort((a, b) => b[1] - a[1]), [photos])

  const shown = useMemo(() => {
    const filtered = photos.filter(photo => (
      (!year || takenYear(photo) === year) && (!camera || cameraOf(photo) === camera)
    ))
    const byDate = photo => new Date(photo.taken_at || photo.created_at || 0).getTime()
    const sorted = [...filtered]
    if (sort === 'oldest') sorted.sort((a, b) => byDate(a) - byDate(b))
    else if (sort === 'name') {
      sorted.sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'pl'))
    } else sorted.sort((a, b) => byDate(b) - byDate(a))
    return sorted
  }, [photos, year, camera, sort])

  return {
    shown,
    years,
    cameras,
    controls: {
      sort, onSort: setSort,
      year, onYear: setYear,
      camera, onCamera: setCamera,
      layout, onLayout: setLayout,
      tileSize, onTileSize: setTileSize,
      years, cameras,
      shown: shown.length,
      total: photos.length,
    },
  }
}
