import { ArrowRight } from 'lucide-react'
import { CATALOG_PATH, plural } from '../lib/projects'
import { SectionRail } from '../lib/ui'
import Hero from './Hero'
import Register from './Register'
import SectionHead from './SectionHead'
import Scope from './Scope'
import Process from './Process'
import PagesGrid from './PagesGrid'
import About from './About'
import Faq from './Faq'
import Contact from './Contact'

const RAIL = [
  ['start', 'Start'],
  ['realizacje', 'Realizacje'],
  ['zakres', 'Zakres'],
  ['proces', 'Proces'],
  ['o-mnie', 'O mnie'],
  ['kontakt', 'Kontakt'],
]

const FEATURED_LIMIT = 5

export default function Home({ content, pages, projects, onNavigate }) {
  // Na stronie głównej stoją tylko pozycje zaznaczone w panelu jako wybrane;
  // gdy żadnej nie zaznaczono, pokazujemy początek rejestru.
  const marked = projects.filter(project => project.featured)
  const featured = (marked.length ? marked : projects).slice(0, FEATURED_LIMIT)
  const hidden = projects.length - featured.length
  const scopeOptions = (content.scope.items || []).map(item => item.title)

  return (
    <main>
      <SectionRail sections={RAIL} />
      <Hero hero={content.hero} projects={projects} onNavigate={onNavigate} />

      <section className="section work" id="realizacje">
        <SectionHead
          title={content.projects.title}
          accent={content.projects.accent}
          lead={content.projects.lead}
          count={hidden > 0
            ? `${featured.length} z ${projects.length} — ${hidden} ${plural(hidden, 'pozycja czeka w pełnym rejestrze', 'pozycje czekają w pełnym rejestrze', 'pozycji czeka w pełnym rejestrze')}`
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
    </main>
  )
}
