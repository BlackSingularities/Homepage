import { useState } from 'react'
import Hero from './Hero'
import Manifesto from './Manifesto'
import Services from './Services'
import Intelligence from './Intelligence'
import Work from './Work'
import Process from './Process'
import Estimator from './Estimator'
import PagesGrid from './PagesGrid'
import About from './About'
import Faq from './Faq'
import Contact from './Contact'

export default function Home({ content, pages, onNavigate }) {
  const [prefill, setPrefill] = useState(null)
  const scopeOptions = (content.services.items || []).map(item => item.title)

  return (
    <main>
      <Hero hero={content.hero} projects={content.work.items} />
      <Manifesto data={content.manifesto} />
      <Services data={content.services} />
      <Intelligence data={content.intelligence} />
      <Work data={content.work} />
      <Process data={content.process} />
      <Estimator data={content.estimator} onRequest={value => setPrefill({ ...value, key: Date.now() })} />
      <PagesGrid data={content.pagesSection} pages={pages} onNavigate={onNavigate} />
      <About data={content.about} brand={content.brand} />
      <Faq data={content.faq} />
      <Contact data={content.contact} brand={content.brand} scopeOptions={scopeOptions} prefill={prefill} />
    </main>
  )
}
