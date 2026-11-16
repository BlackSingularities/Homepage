import { useEffect, useRef, useState } from 'react'
import { DepthField } from '../components/depth-field/depth-field'

const MAX_PHOTOS = 24

/** Losowa kolejność – przy każdym wejściu na stronę inny zestaw zdjęć. */
function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Tło sekcji „O mnie” i „FAQ”: chmura zdjęć z publicznej galerii (portfolio),
 * lecąca w głąb ekranu. Zdjęcia pobieramy dopiero, gdy sekcje zbliżają się
 * do widoku; animacja sama staje, gdy zniknie z ekranu. Warstwa jest
 * przyklejona do okna, więc towarzyszy obu sekcjom podczas przewijania.
 */
export default function GalleryBackdrop({ children }) {
  const root = useRef(null)
  const [near, setNear] = useState(false)
  const [images, setImages] = useState([])

  useEffect(() => {
    const element = root.current
    if (!element || near) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: '800px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [near])

  useEffect(() => {
    if (!near) return
    let active = true
    fetch('/galeria/api/portfolio')
      .then(response => (response.ok ? response.json() : []))
      .then(photos => {
        if (!active || !Array.isArray(photos)) return
        const urls = shuffle(photos.filter(photo => photo.thumb))
          .slice(0, MAX_PHOTOS)
          .map(photo => `/galeria/thumbs/${encodeURIComponent(photo.thumb)}`)
        setImages(urls)
      })
      .catch(() => {})
    return () => { active = false }
  }, [near])

  return (
    <div className="gallery-backdrop" ref={root}>
      {images.length > 0 && (
        <div className="gallery-backdrop-layer" aria-hidden="true">
          <div className="gallery-backdrop-sticky">
            <DepthField
              images={images}
              showText={false}
              background="transparent"
              height="100%"
              speed={5}
              entryBurst={50}
              entryDuration={2.4}
              scrollBoost={40}
              rotationSpeed={6}
              rotationDirection="counterclockwise"
              spread={15}
              depth={96}
              count={30}
              imageSize={5.5}
              imageRadius={4}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
