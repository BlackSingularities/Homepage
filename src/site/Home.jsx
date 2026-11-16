import Hero from './Hero'
import Scope from './Scope'
import Process from './Process'
import PagesGrid from './PagesGrid'
import About from './About'
import Faq from './Faq'
import GalleryBackdrop from './GalleryBackdrop'
import Contact from './Contact'

export default function Home({ content, pages, projects, onNavigate }) {
  // Karuzela na stronie głównej pokazuje wyłącznie pozycje zaznaczone w panelu
  // jako wybrane (i tylko te z plakatem – filtruje Hero).
  const featured = projects.filter(project => project.featured)
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
        <GalleryBackdrop>
          <About data={content.about} brand={content.brand} />
          <Faq data={content.faq} />
        </GalleryBackdrop>
        <Contact data={content.contact} brand={content.brand} scopeOptions={scopeOptions} apps={projects} />
      </div>
    </main>
  )
}
