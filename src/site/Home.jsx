import Hero from './Hero'
import Scope from './Scope'
import Process from './Process'
import PagesGrid from './PagesGrid'
import About from './About'
import Faq from './Faq'
import Contact from './Contact'

const FEATURED_LIMIT = 5

export default function Home({ content, pages, projects, onNavigate }) {
  // Na stronie głównej stoją tylko pozycje zaznaczone w panelu jako wybrane;
  // gdy żadnej nie zaznaczono, pokazujemy początek portfolio.
  const marked = projects.filter(project => project.featured)
  const featured = (marked.length ? marked : projects).slice(0, FEATURED_LIMIT)
  const scopeOptions = (content.scope.items || []).map(item => item.title)

  return (
    <main>
      <Hero
        hero={content.hero}
        labels={content.projects}
        featured={featured}
        total={projects.length}
        onNavigate={onNavigate}
      />

      <div className="page-slab">
        <Scope data={content.scope} />
        <Process data={content.process} />
        <PagesGrid data={content.pagesSection} pages={pages} onNavigate={onNavigate} />
        <About data={content.about} brand={content.brand} />
        <Faq data={content.faq} />
        <Contact data={content.contact} brand={content.brand} scopeOptions={scopeOptions} apps={projects} />
      </div>
    </main>
  )
}
