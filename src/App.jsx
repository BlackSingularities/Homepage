import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import GlyphField from './site/GlyphField'
import Header from './site/Header'
import Footer from './site/Footer'
import Home from './site/Home'
import Catalog from './site/Catalog'
import Resources from './site/Resources'
import ProjectView from './site/ProjectView'
import PageView from './site/PageView'
import CookieBanner from './site/CookieBanner'
import { trackPageview } from './lib/analytics'
import { LangContext, splitLang, translate } from './lib/i18n'
import { CATALOG_PATH } from './lib/projects'
import { applySeo } from './lib/seo'
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

/** Rozkłada adres (już bez prefiksu języka) na widok. */
function routeOf(path) {
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === '/do-pobrania') return { view: 'resources' }
  if (clean.startsWith('/do-pobrania/')) return { view: 'resources', slug: decodeURIComponent(clean.slice(13)) }
  if (clean === CATALOG_PATH) return { view: 'catalog' }
  if (clean === '/realizacje') return { view: 'catalog' }
  if (clean.startsWith(`${CATALOG_PATH}/`)) {
    return { view: 'project', slug: decodeURIComponent(clean.slice(CATALOG_PATH.length + 1)) }
  }
  if (clean.startsWith('/p/')) return { view: 'page', slug: decodeURIComponent(clean.slice(3)) }
  return { view: 'home' }
}

/** Serwer wstawia treść dla robotów do #root – po starcie aplikacji jest zbędna. */
function dropPrerender() {
  document.querySelectorAll('[data-prerender]').forEach(node => node.remove())
}

export default function App() {
  const [path, setPath] = usePath()
  const { lang, path: localPath } = splitLang(path)
  const { content, pages, projects } = useSiteData(lang)

  useEffect(dropPrerender, [])

  useEffect(() => {
    if (!path.startsWith('/admin')) trackPageview(path)
  }, [path])

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

  const route = routeOf(localPath)

  // Strona główna i portfolio mają stałe meta; realizacje i podstrony
  // ustawiają je same, gdy dociągną dane.
  useEffect(() => {
    if (path.startsWith('/admin')) return
    if (route.view === 'home') {
      applySeo({ lang, path: '/', title: translate(lang, 'seo.homeTitle'), description: translate(lang, 'seo.homeDescription') })
    }
    if (route.view === 'catalog') {
      applySeo({ lang, path: CATALOG_PATH, title: translate(lang, 'seo.catalogTitle'), description: translate(lang, 'seo.catalogDescription') })
    }
  }, [lang, route.view, path])

  if (path.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="page-state"><LoaderCircle className="spin" size={26} /><span>Panel</span></div>}>
        <Admin />
      </Suspense>
    )
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="site">
        <GlyphField />
        <Header brand={content.brand} pages={pages} home={route.view === 'home'} path={localPath} onNavigate={navigate} />
        {route.view === 'home' && <Home content={content} pages={pages} projects={projects} onNavigate={navigate} />}
        {route.view === 'resources' && <Resources slug={route.slug} onNavigate={navigate} />}
        {route.view === 'catalog' && <Catalog data={content.catalog} projects={projects} onNavigate={navigate} />}
        {route.view === 'project' && <ProjectView slug={route.slug} onNavigate={navigate} />}
        {route.view === 'page' && <PageView slug={route.slug} onNavigate={navigate} />}
        <Footer brand={content.brand} pages={pages} home={route.view === 'home'} onNavigate={navigate} />
        <CookieBanner />
      </div>
    </LangContext.Provider>
  )
}
