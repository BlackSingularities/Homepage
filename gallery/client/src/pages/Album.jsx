import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { getAlbum } from '../api'
import Grid from '../components/Grid'
import SkeletonGrid from '../components/SkeletonGrid'
import BackToTop from '../components/BackToTop'
import PasswordGate from '../components/PasswordGate'
import GalleryToolbar, { photoWord } from '../components/GalleryToolbar'
import { Nav, Footer } from '../components/Chrome'
import { usePhotoView } from '../lib/photoView'
import { setPageMeta } from '../lib/seo'
import { IconImage } from '../components/icons'

/**
 * Album – ten sam sposób oglądania, co w portfolio, tyle że zbiór bywa
 * zamknięty na hasło. Również bez pobierania: można podesłać link do
 * konkretnego zdjęcia, ale plik źródłowy nigdy nie opuszcza serwera.
 */

const TOKEN_KEY = (slug) => `album_token_${slug}`

export default function Album() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [mediaToken, setMediaToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsPass, setNeedsPass] = useState(false)
  const [albumName, setAlbumName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const { shown, controls } = usePhotoView(data?.photos || [], `album_${slug}`)

  const load = async (token) => {
    setLoading(true)
    try {
      const d = await getAlbum(slug, token)
      setData(d)
      setMediaToken(token || null)
      setNeedsPass(false)
      setPageMeta({
        title: `${d.album.name} – Adam Rędzikowski`,
        description: d.album.description || `Album zdjęć: ${d.album.name}`,
      })
    } catch (err) {
      if (err.status === 401) {
        setNeedsPass(true)
        if (err.albumName) setAlbumName(err.albumName)
      } else if (err.status === 404) {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlToken = searchParams.get('t')
    const saved = sessionStorage.getItem(TOKEN_KEY(slug))
    load(urlToken || saved || localStorage.getItem('admin_token'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handleUnlock = (token) => {
    if (token) sessionStorage.setItem(TOKEN_KEY(slug), token)
    load(token)
  }

  if (loading) return (
    <div className="page">
      <Nav current="album" />
      <div className="gallery-wrap" style={{ paddingTop: 40 }}>
        <SkeletonGrid count={9} />
      </div>
    </div>
  )

  if (needsPass) return (
    <div className="page" style={{ paddingTop: 0 }}>
      <PasswordGate slug={slug} albumName={albumName || slug} onUnlock={handleUnlock} />
    </div>
  )

  if (notFound || !data) return (
    <div className="page">
      <Nav current="album" />
      <div className="empty-state" style={{ paddingTop: 120 }}>
        <IconImage width={40} height={40} style={{ opacity: .3, margin: '0 auto' }} />
        <p>Ten album nie istnieje albo został usunięty.</p>
        <Link to="/" style={{ color: 'var(--gold)', fontSize: 13 }}>Wróć do galerii</Link>
      </div>
    </div>
  )

  const { album, photos } = data

  return (
    <div className="page">
      <Nav current="album" />

      <div className="breadcrumbs">
        <Link to="/">Galeria</Link>
        <span>/</span>
        <span className="breadcrumbs-current">{album.name}</span>
      </div>

      <div className="section-wrap" style={{ paddingTop: 20, paddingBottom: 0 }}>
        <p className="section-label">Album</p>
        <h1 className="section-heading" style={{ marginBottom: album.description ? 14 : 18 }}>{album.name}</h1>
        {album.description && (
          <p className="hero-lead" style={{ marginBottom: 14 }}>{album.description}</p>
        )}
        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
          {photos.length} {photoWord(photos.length)}
          {album.has_password ? ' · album na hasło' : ''}
        </p>
      </div>

      {photos.length > 0 && <GalleryToolbar {...controls} />}

      <div className="gallery-wrap">
        {shown.length === 0 ? (
          <div className="empty-state"><p>Żadne zdjęcie nie pasuje do wybranych filtrów.</p></div>
        ) : (
          <Grid
            photos={shown}
            syncUrl
            mediaToken={mediaToken}
            canShare
            albumSlug={slug}
            tileSize={controls.tileSize}
            layout={controls.layout}
            showTileSizeControl={false}
          />
        )}
      </div>

      <p className="gal-note">
        Album jest do oglądania – zdjęcia wyświetlają się w pomniejszonej kopii z podpisem.
        Pliki w pełnej jakości wysyłam na życzenie.
      </p>

      <Footer />
      <BackToTop />
    </div>
  )
}
