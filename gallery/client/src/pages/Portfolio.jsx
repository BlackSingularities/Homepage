import { useEffect, useMemo, useState } from 'react'
import { getPortfolio, thumbUrl } from '../api'
import Grid from '../components/Grid'
import SkeletonGrid from '../components/SkeletonGrid'
import BackToTop from '../components/BackToTop'
import GalleryToolbar, { photoWord } from '../components/GalleryToolbar'
import { Nav, Footer } from '../components/Chrome'
import { usePhotoView } from '../lib/photoView'
import { setPageMeta } from '../lib/seo'
import { IconImage } from '../components/icons'

/**
 * Galeria fotograficzna. Zdjęcia są tu do oglądania – nie ma pobierania,
 * a przeglądarka dostaje wyłącznie wariant poglądowy z podpisem wypalonym
 * w pliku. Pierwszy ekran to same zdjęcia: kilka kadrów przenika pod tytułem,
 * a cała reszta strony stoi nieruchomo.
 */

const HERO_SLIDES = 5
const HERO_MS = 6000

function Hero({ photos }) {
  const [current, setCurrent] = useState(0)

  // Kadry wybieramy raz na wejście, żeby nie przeskakiwały przy każdym
  // odświeżeniu stanu listy.
  const slides = useMemo(() => photos.slice(0, HERO_SLIDES), [photos])

  useEffect(() => {
    if (slides.length < 2) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => setCurrent(i => (i + 1) % slides.length), HERO_MS)
    return () => clearInterval(timer)
  }, [slides.length])

  const years = photos
    .map(photo => (photo.taken_at ? new Date(photo.taken_at).getFullYear() : null))
    .filter(Boolean)
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null

  return (
    <header className="hero">
      <div className="hero-slides" aria-hidden="true">
        {slides.map((photo, index) => (
          <div
            key={photo.id}
            className={`hero-slide ${index === current ? 'is-current' : ''}`}
            style={{ backgroundImage: `url(${thumbUrl(photo.thumb)})` }}
          />
        ))}
        <div className="hero-overlay" />
      </div>

      <div className="hero-content">
        <h1 className="hero-title">Światło, które <em>zdążyłem</em> zatrzymać</h1>
        <p className="hero-lead">
          Zdjęcia z plenerów, portretów i miejsc, w których akurat byłem. Bez retuszu rzeczywistości –
          tak, jak wyglądały w chwili naciśnięcia spustu.
        </p>
        {photos.length > 0 && (
          <p className="hero-facts">
            <span><b>{photos.length}</b> {photoWord(photos.length)}</span>
            {span && <span>z lat <b>{span}</b></span>}
            <span>do oglądania, bez pobierania</span>
          </p>
        )}
      </div>

      <span className="hero-scroll" aria-hidden="true"><i /> przewiń</span>
    </header>
  )
}

export default function Portfolio() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { shown, controls } = usePhotoView(photos, 'portfolio')

  useEffect(() => {
    setPageMeta({
      title: 'Galeria fotograficzna – Adam Rędzikowski',
      description: 'Wybrane zdjęcia: plenery, portrety i reportaż. Galeria do oglądania w przeglądarce.',
    })
    getPortfolio()
      .then(setPhotos)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <Nav />
      {photos.length > 0 && <Hero photos={photos} />}

      <div className="section-wrap" style={{ paddingBottom: 0 }}>
        <p className="section-label">Portfolio fotograficzne</p>
        <h2 className="section-heading">Wybrane <em>kadry</em></h2>
      </div>

      {!loading && !error && photos.length > 0 && <GalleryToolbar {...controls} />}

      <div className="gallery-wrap">
        {loading ? (
          <SkeletonGrid count={12} />
        ) : error ? (
          <div className="empty-state">
            <IconImage width={40} height={40} style={{ opacity: .3, margin: '0 auto' }} />
            <p>Nie udało się wczytać galerii. Odśwież stronę albo wróć za chwilę.</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="empty-state">
            <IconImage width={40} height={40} style={{ opacity: .3, margin: '0 auto' }} />
            <p style={{ marginTop: 12 }}>Galeria jest jeszcze pusta.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <p>Żadne zdjęcie nie pasuje do wybranych filtrów.</p>
          </div>
        ) : (
          <Grid
            photos={shown}
            syncUrl
            tileSize={controls.tileSize}
            layout={controls.layout}
            showTileSizeControl={false}
          />
        )}
      </div>

      {photos.length > 0 && (
        <p className="gal-note">
          Zdjęcia są chronione: strona pokazuje pomniejszone kopie z podpisem, pliki źródłowe zostają na serwerze.
          Potrzebujesz któregoś zdjęcia w pełnej jakości – napisz, chętnie je wyślę.
        </p>
      )}

      <Footer />
      <BackToTop />
    </div>
  )
}
