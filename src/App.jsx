import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Camera,
  Code2,
  DatabaseZap,
  Gauge,
  Globe2,
  Layers3,
  Map,
  Plane,
  Route,
  Sparkles,
  Table2,
  Workflow,
} from 'lucide-react'

const fade = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const tools = [
  'Power BI',
  'Google Looker Studio',
  'Excel / Power Query',
  'Google Sheets',
  'Apps Script',
  'SQL',
  'Python',
  'React',
  'FastAPI',
  'Docker',
  'Automatyzacje',
  'AI workflow',
]

const capabilities = [
  {
    icon: BarChart3,
    title: 'Business intelligence',
    text: 'Dashboardy, modele danych, KPI, raporty zarządcze i analityka, która zamienia chaos operacyjny w decyzje.',
  },
  {
    icon: Table2,
    title: 'Excel, Sheets i Apps Script',
    text: 'Zaawansowane arkusze, automatyzacje, importy danych, walidacje, raporty cykliczne i narzędzia dla zespołów.',
  },
  {
    icon: DatabaseZap,
    title: 'Aplikacje do analizy danych',
    text: 'Własne panele, wyszukiwarki, ekosystemy wiedzy, narzędzia admina i aplikacje skrojone pod proces.',
  },
  {
    icon: Layers3,
    title: 'Pełne web ecosystemy',
    text: 'Strony, backendy, bazy, panele zarządzania, Docker, reverse proxy i wdrożenia obok istniejących usług.',
  },
  {
    icon: Camera,
    title: 'Fotografia i opowieść wizualna',
    text: 'Kadry podróżnicze, produktowe i wizerunkowe, które nadają projektom charakter zamiast stockowego szumu.',
  },
  {
    icon: Plane,
    title: 'Podróże i lotnictwo',
    text: 'Mapy, trasy, przewodniki, encyklopedie miejsc i narzędzia inspirowane ruchem, geografią i eksploracją.',
  },
]

const liveApps = [
  {
    name: 'Galeria',
    href: '/galeria',
    kind: 'Photography system',
    text: 'Portfolio fotograficzne i galerie z naciskiem na estetykę, selekcję i prezentację kadrów.',
    tags: ['Photo', 'Portfolio', 'UX'],
  },
  {
    name: 'Travels',
    href: '/travels',
    kind: 'Travel journal',
    text: 'Dziennik podróży, mapy, zdjęcia i struktura do opowiadania historii z drogi.',
    tags: ['Travel', 'Maps', 'Content'],
  },
  {
    name: 'Kompendium Podróżnicze',
    href: '/kompendium-podroznicze',
    kind: 'Travel knowledge base',
    text: 'Rozbudowana baza miejsc, atrakcji i treści podróżniczych z architekturą pod zarządzanie.',
    tags: ['FastAPI', 'React', 'Admin'],
  },
  {
    name: 'Navigator',
    href: '/navigator',
    kind: 'Route intelligence',
    text: 'Eksplorator tras GPX, mapy, analiza przebiegów i narzędzia dla aktywności terenowych.',
    tags: ['GPX', 'Maps', 'Analytics'],
  },
  {
    name: 'Kompendium IT',
    href: '/kompendium-it',
    kind: 'Knowledge system',
    text: 'Baza wiedzy IT, która porządkuje materiały i skraca drogę od pytania do rozwiązania.',
    tags: ['Knowledge', 'Docs', 'Search'],
  },
  {
    name: 'Języki AI',
    href: '/jezyki-ai',
    kind: 'Learning app',
    text: 'Aplikacja edukacyjna łącząca naukę języków z technologią i szybkim prototypowaniem.',
    tags: ['Learning', 'AI', 'Product'],
  },
]

const cases = [
  {
    label: 'BI cockpit',
    title: 'Od danych rozrzuconych po arkuszach do jednego widoku zarządczego.',
    text: 'Łączę Power BI, Looker Studio, Sheets, Excel i automatyzacje, żeby firmy widziały sprzedaż, koszty, działania i anomalie bez ręcznego przeklejania danych.',
  },
  {
    label: 'Operational web app',
    title: 'Strona jako pełnoprawny system, nie wizytówka.',
    text: 'Projektuję warstwę publiczną, panel admina, modele danych, uploady, wyszukiwarki, role, statusy i deployment, aby strona mogła rosnąć razem z biznesem.',
  },
  {
    label: 'Vibe coding + rygor',
    title: 'Szybkie prototypowanie, ale z inżynierską kontrolą.',
    text: 'Wykorzystuję AI do przyspieszania budowy, lecz finalnie liczą się testy, stabilność, czytelna architektura i deployment, który da się utrzymać.',
  },
]

const timeline = [
  'Rozpoznanie procesu, danych i celu biznesowego',
  'Projekt informacji: KPI, role, ekrany, źródła danych',
  'Prototyp interfejsu i ścieżek użytkownika',
  'Implementacja aplikacji, automatyzacji lub raportu',
  'Docker, reverse proxy, monitoring i iteracje po wdrożeniu',
]

function SectionHeader({ kicker, title, text }) {
  return (
    <motion.div className="section-head" variants={fade}>
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </motion.div>
  )
}

function AppCard({ app }) {
  return (
    <motion.a href={app.href} className="app-card" variants={fade}>
      <div className="app-card-top">
        <span>{app.kind}</span>
        {app.status && <strong>{app.status}</strong>}
      </div>
      <h3>{app.name}</h3>
      <p>{app.text}</p>
      <div className="tag-row">
        {app.tags.map((tag) => <em key={tag}>{tag}</em>)}
      </div>
      <div className="card-link">
        Otwórz <ArrowUpRight size={16} />
      </div>
    </motion.a>
  )
}

export default function App() {
  return (
    <div className="site-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="grain" />

      <header className="nav">
        <a className="brand" href="#top" aria-label="Adam Rędzikowski">
          <span>AR</span>
          <strong>Adam Rędzikowski</strong>
        </a>
        <nav>
          <a href="#systems">Systemy</a>
          <a href="#apps">Aplikacje</a>
          <a href="#craft">Proces</a>
          <a href="#contact">Kontakt</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.div className="hero-badge" variants={fade}>
              <Sparkles size={16} />
              Data, web, automatyzacje i obrazy z charakterem
            </motion.div>
            <motion.h1 variants={fade}>
              Projektuję systemy, które porządkują dane, procesy i doświadczenia.
            </motion.h1>
            <motion.p className="hero-lead" variants={fade}>
              Łączę analitykę biznesową, Power BI, Looker Studio, Excel, Google Apps Script,
              aplikacje webowe, fotografię i myślenie produktowe. Tworzę dopracowane strony
              i narzędzia, które stają się pełnym ekosystemem do zarządzania, analizy i rozwoju.
            </motion.p>
            <motion.div className="hero-actions" variants={fade}>
              <a className="primary-action" href="#apps">Zobacz aplikacje</a>
              <a className="secondary-action" href="mailto:redzikowskia@gmail.com">Napisz do mnie</a>
            </motion.div>
          </motion.div>

          <motion.aside
            className="hero-panel"
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <div className="portrait-wrap">
              <img src="/assets/adam.jpg" alt="Adam Rędzikowski" />
            </div>
            <div className="metric-grid">
              <div><strong>BI</strong><span>raporty, KPI, decyzje</span></div>
              <div><strong>WEB</strong><span>aplikacje i panele</span></div>
              <div><strong>AI</strong><span>research i workflow</span></div>
              <div><strong>PHOTO</strong><span>podróże i estetyka</span></div>
            </div>
          </motion.aside>
        </section>

        <section className="tool-strip" aria-label="Technologie">
          <div className="tool-track">
            {[...tools, ...tools].map((tool, index) => (
              <span key={`${tool}-${index}`}>{tool}</span>
            ))}
          </div>
        </section>

        <motion.section
          id="systems"
          className="content-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Co robię"
            title="Analityka, automatyzacje i web w jednej architekturze."
            text="Najlepsze projekty nie kończą się na ładnym ekranie. Muszą mieć dane, proces, kontrolę, zarządzanie i miejsce na rozwój."
          />

          <div className="capability-grid">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <motion.article className="capability-card" key={title} variants={fade}>
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="apps"
          className="content-section apps-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Live ecosystem"
            title="Aplikacje działające na tym serwerze."
            text="To nie są makiety. To zestaw usług spiętych Dockerem, reverse proxy i konsekwentną logiką rozwoju."
          />
          <div className="apps-grid">
            {liveApps.map((app) => <AppCard key={app.name} app={app} />)}
          </div>
        </motion.section>

        <motion.section
          className="content-section case-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Specjalizacje"
            title="Od dashboardu do pełnej platformy."
          />
          <div className="case-grid">
            {cases.map((item) => (
              <motion.article className="case-card" key={item.label} variants={fade}>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="craft"
          className="content-section craft-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Jak pracuję"
            title="Estetyka premium, ale pod spodem konkretna inżynieria."
            text="Projekt ma wyglądać jak spod ręki artysty, ale zachowywać się jak narzędzie, któremu można zaufać."
          />
          <div className="craft-layout">
            <motion.div className="timeline-card" variants={fade}>
              {timeline.map((step, index) => (
                <div className="timeline-item" key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{step}</p>
                </div>
              ))}
            </motion.div>
            <motion.div className="interest-card" variants={fade}>
              <div className="interest-icons">
                <Globe2 />
                <Plane />
                <Route />
                <Camera />
                <BrainCircuit />
                <Workflow />
              </div>
              <h3>Biznes, podróże, lotnictwo, fotografia i AI jako jeden język projektowania.</h3>
              <p>
                Mapy uczą struktury, lotnictwo procedur, fotografia kompozycji, a analityka
                dyscypliny. Z tego miksu powstają narzędzia, które są szczegółowe,
                uporządkowane i przyjemne w użyciu.
              </p>
            </motion.div>
          </div>
        </motion.section>

        <section className="content-section signal-section">
          <div className="signal-card">
            <Gauge size={28} />
            <div>
              <span>Tryb pracy</span>
              <h2>Potrafię wejść od strony danych, produktu albo designu i dowieźć całość do Dockera.</h2>
            </div>
            <Code2 size={28} />
          </div>
        </section>

        <section id="contact" className="contact-section">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7 }}
          >
            <span className="kicker">Kontakt</span>
            <h2>Masz dane, proces albo pomysł na aplikację? Zróbmy z tego narzędzie.</h2>
            <p>
              Najchętniej pracuję przy projektach, w których estetyka spotyka się z realnym
              procesem: raporty, automatyzacje, aplikacje, systemy wiedzy i webowe ekosystemy.
            </p>
            <div className="contact-actions">
              <a className="primary-action" href="mailto:redzikowskia@gmail.com">redzikowskia@gmail.com</a>
              <a className="secondary-action" href="https://github.com/BlackSingularities" target="_blank" rel="noreferrer">
                GitHub <ArrowUpRight size={16} />
              </a>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
