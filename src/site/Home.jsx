import { PointerGlow, SectionRail } from '../lib/ui'
import Hero from './Hero'
import Manifesto from './Manifesto'
import Services from './Services'
import Intelligence from './Intelligence'
import Process from './Process'
import PagesGrid from './PagesGrid'
import About from './About'
import Faq from './Faq'
import Contact from './Contact'

const RAIL = [
  ['start', 'Start'],
  ['uslugi', 'Zakres'],
  ['ai', 'AI'],
  ['proces', 'Proces'],
  ['o-mnie', 'O mnie'],
  ['kontakt', 'Kontakt'],
]

export default function Home({ content, pages, onNavigate }) {
  const scopeOptions = (content.services.items || []).map(item => item.title)

  return (
    <main>
      <PointerGlow />
      <SectionRail sections={RAIL} />
      <Hero hero={content.hero} projects={content.work.items} onNavigate={onNavigate} />
      <Manifesto data={content.manifesto} />
      <Services data={content.services} />
      <Intelligence data={content.intelligence} />
      <Process data={content.process} />
      <PagesGrid data={content.pagesSection} pages={pages} onNavigate={onNavigate} />
      <About data={content.about} brand={content.brand} />
      <Faq data={content.faq} />
      <Contact data={content.contact} brand={content.brand} scopeOptions={scopeOptions} />
    </main>
  )
}
