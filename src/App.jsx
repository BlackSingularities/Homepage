import Cursor from './components/Cursor'
import Grain from './components/Grain'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Marquee from './components/Marquee'
import Services from './components/Services'
import Portfolio from './components/Portfolio'
import Contact from './components/Contact'

export default function App() {
  return (
    <>
      <Cursor />
      <Grain />
      <Nav />
      <main>
        <Hero />
        <About />
        <Marquee />
        <Services />
        <Portfolio />
        <Contact />
      </main>
    </>
  )
}
