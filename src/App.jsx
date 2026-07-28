import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import Header from './site/Header'
import Footer from './site/Footer'
import Home from './site/Home'
import PageView from './site/PageView'
import { useSiteData } from './lib/useSiteData'

const Admin = lazy(() => import('./admin/Admin'))

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return [path, setPath]
}

export default function App() {
  const [path, setPath] = usePath()
  const { content, pages } = useSiteData()

  const navigate = useCallback(target => {
    const [pathname, hash] = target.split('#')
    const nextPath = pathname || '/'
    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', hash ? `${nextPath}#${hash}` : nextPath)
      setPath(nextPath)
      window.scrollTo({ top: 0 })
    }
    if (hash) {
      requestAnimationFrame(() => {
        setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      })
    }
  }, [setPath])

  if (path.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="page-state"><LoaderCircle className="spin" size={26} /><span>Panel</span></div>}>
        <Admin />
      </Suspense>
    )
  }

  const slug = path.startsWith('/p/') ? decodeURIComponent(path.slice(3).replace(/\/$/, '')) : ''
  const isHome = !slug

  return (
    <div className="site">
      <div className="grain" aria-hidden="true" />
      <Header brand={content.brand} pages={pages} home={isHome} onNavigate={navigate} />
      {isHome
        ? <Home content={content} pages={pages} onNavigate={navigate} />
        : <PageView slug={slug} onNavigate={navigate} />}
      <Footer brand={content.brand} pages={pages} home={isHome} onNavigate={navigate} />
    </div>
  )
}
