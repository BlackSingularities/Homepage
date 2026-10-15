import { ArrowRight } from 'lucide-react'
import { CATALOG_PATH, plural } from '../lib/projects'
import Hero from './Hero'
import Register from './Register'
import SectionHead from './SectionHead'
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
  const hidden = projects.length - featured.length
  const scopeOptions = (content.scope.items || []).map(item => item.title)

  return (
    <main>
      <Hero hero={content.hero} projects={projects} onNavigate={onNavigate} />

      {/* Wszystko poniżej hero stoi na jednej płycie, żeby dym nie przechodził
          pod treścią, a kolumna miała wyraźny początek i koniec. */}
      <div className="page-slab">
      <section className="section work" id="portfolio">
        <SectionHead
          title={content.projects.title}
          accent={content.projects.accent}
          lead={content.projects.lead}
          count={hidden > 0
            ? `${featured.length} z ${projects.length} — ${hidden} ${plural(hidden, 'pozycja czeka w portfolio', 'pozycje czekają w portfolio', 'pozycji czeka w portfolio')}`
            : undefined}
        />
        <Register projects={featured} onNavigate={onNavigate} lead empty={content.projects.empty} />
        {projects.length > featured.length && (
          <a
            className="btn btn-ghost work-more"
            href={CATALOG_PATH}
            onClick={event => { event.preventDefault(); onNavigate(CATALOG_PATH) }}
          >
            {content.projects.catalogCta} <ArrowRight size={16} />
          </a>
        )}
      </section>

      <Scope data={content.scope} />
      <Process data={content.process} />
      <PagesGrid data={content.pagesSection} pages={pages} onNavigate={onNavigate} />
      <About data={content.about} brand={content.brand} />
      <Faq data={content.faq} />
      <Contact data={content.contact} brand={content.brand} scopeOptions={scopeOptions} />
      </div>
    </main>
  )
}
