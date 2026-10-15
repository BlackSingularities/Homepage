import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import GlyphField from './site/GlyphField'
import Header from './site/Header'
import Footer from './site/Footer'
import Home from './site/Home'
import Catalog from './site/Catalog'
import ProjectView from './site/ProjectView'
import PageView from './site/PageView'
import { CATALOG_PATH } from './lib/projects'
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

/** Rozkłada adres na widok: strona główna, katalog, realizacja albo podstrona. */
function routeOf(path) {
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === CATALOG_PATH) return { view: 'catalog' }
  if (clean.startsWith(`${CATALOG_PATH}/`)) {
    return { view: 'project', slug: decodeURIComponent(clean.slice(CATALOG_PATH.length + 1)) }
  }
  if (clean.startsWith('/p/')) return { view: 'page', slug: decodeURIComponent(clean.slice(3)) }
  return { view: 'home' }
}

export default function App() {
  const [path, setPath] = usePath()
  const { content, pages, projects } = useSiteData()

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

  const route = routeOf(path)

  return (
    <div className="site">
      <GlyphField />
      <Header brand={content.brand} pages={pages} home={route.view === 'home'} onNavigate={navigate} />
      {route.view === 'home' && <Home content={content} pages={pages} projects={projects} onNavigate={navigate} />}
      {route.view === 'catalog' && <Catalog data={content.catalog} projects={projects} onNavigate={navigate} />}
      {route.view === 'project' && <ProjectView slug={route.slug} onNavigate={navigate} />}
      {route.view === 'page' && <PageView slug={route.slug} onNavigate={navigate} />}
      <Footer brand={content.brand} pages={pages} home={route.view === 'home'} onNavigate={navigate} />
    </div>
  )
}
