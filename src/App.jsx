import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Camera,
  Code2,
  Container,
  DatabaseZap,
  Layers3,
  LineChart,
  Map,
  Plane,
  Sparkle,
  Sparkles,
  TerminalSquare,
  Wand2,
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
  'HTML / CSS',
  'Vibecoding',
  'AI workflow',
  'Docker',
  'SSH',
  'Linux',
  'Reverse proxy',
  'Git',
  'Power BI',
  'Looker Studio',
  'Excel / Power Query',
  'Google Sheets',
  'Apps Script',
]

const skills = [
  {
    icon: Wand2,
    title: 'Vibecoding stron i aplikacji',
    text: 'Nie piszę klasycznie w żadnym języku poza HTML i CSS — ale z pomocą AI buduję realnie działające strony i narzędzia. Rozumiem, jak to wszystko działa, i doprowadzam projekt do końca.',
  },
  {
    icon: Container,
    title: 'Serwery i wdrożenia',
    text: 'Docker, SSH, Linux, reverse proxy, domeny i certyfikaty. Potrafię postawić aplikację na własnym serwerze i utrzymać ją obok innych usług.',
  },
  {
    icon: LineChart,
    title: 'Analityka danych',
    text: 'Power BI, Looker Studio, Excel i Power Query. Zamieniam rozsypane arkusze w dashboardy, KPI i raporty, na których da się oprzeć decyzje.',
  },
  {
    icon: DatabaseZap,
    title: 'Arkusze i automatyzacje',
    text: 'Google Sheets, Apps Script, formuły, importy i automatyzacje. Wyręczam ludzi w nudnej, powtarzalnej robocie i pilnuję, żeby dane się zgadzały.',
  },
  {
    icon: Sparkle,
    title: 'AI jako codzienne narzędzie',
    text: 'Modele AI traktuję jak współpracownika — do prototypów, researchu, treści i przyspieszania każdego etapu pracy, nie jako ciekawostkę.',
  },
  {
    icon: Layers3,
    title: 'Estetyka i detal',
    text: 'Dbam, żeby to, co robię, dobrze wyglądało: typografia, kompozycja, spójność. Oko fotografa przydaje się też przy interfejsach.',
  },
]

const liveApps = [
  {
    name: 'Open Notebook',
    href: '/open-notebook',
    kind: 'AI research workspace',
    text: 'Prywatny asystent do źródeł, notatek i pracy z wiedzą przy wsparciu modeli AI.',
    tags: ['AI', 'Research', 'Docker'],
    status: 'Nowe',
  },
  {
    name: 'Galeria',
    href: '/galeria',
    kind: 'Portfolio fotograficzne',
    text: 'Moje zdjęcia z podróży i nie tylko — galeria z naciskiem na selekcję i sposób prezentacji kadrów.',
    tags: ['Photo', 'Portfolio', 'UX'],
  },
  {
    name: 'Travels',
    href: '/travels',
    kind: 'Dziennik podróży',
    text: 'Mapy, zdjęcia i historie z drogi spięte w jedno miejsce. Tu spotykają się moje dwie pasje.',
    tags: ['Travel', 'Maps', 'Content'],
  },
  {
    name: 'Kompendium Podróżnicze',
    href: '/kompendium-podroznicze',
    kind: 'Baza wiedzy o miejscach',
    text: 'Rozbudowana baza miejsc i atrakcji z panelem do zarządzania treścią.',
    tags: ['Web app', 'Admin', 'Data'],
  },
  {
    name: 'Navigator',
    href: '/navigator',
    kind: 'Eksplorator tras',
    text: 'Przeglądanie tras GPX, mapy i analiza przebiegów — narzędzie dla ruchu w terenie.',
    tags: ['GPX', 'Maps', 'Analytics'],
  },
  {
    name: 'Kompendium IT',
    href: '/kompendium-it',
    kind: 'Baza wiedzy IT',
    text: 'Uporządkowane materiały i notatki techniczne, które skracają drogę od pytania do rozwiązania.',
    tags: ['Knowledge', 'Docs', 'Search'],
  },
  {
    name: 'Języki AI',
    href: '/jezyki-ai',
    kind: 'Aplikacja do nauki',
    text: 'Nauka języków połączona z AI i szybkim prototypowaniem nowych pomysłów.',
    tags: ['Learning', 'AI', 'Product'],
  },
]

const passions = [
  {
    icon: Camera,
    label: 'Fotografia',
    text: 'Łapię kadry z podróży i z codzienności. Najbardziej kręci mnie światło, geometria i ten jeden właściwy moment.',
  },
  {
    icon: Plane,
    label: 'Lotnictwo',
    text: 'Lotniska, samoloty, procedury i mapy nieba. Śledzę ruch lotniczy i regularnie planuję, dokąd dalej.',
  },
  {
    icon: Map,
    label: 'Podróże',
    text: 'Zbieram miejsca i opowiadam je zdjęciami. Stąd zresztą wzięła się część aplikacji, które buduję.',
  },
]

const timeline = [
  'Rozmowa o tym, co realnie ma się wydarzyć i po co',
  'Szkic struktury: ekrany, dane, ścieżki użytkownika',
  'Prototyp w działaniu — najszybciej jak się da, z pomocą AI',
  'Dopracowanie, treść, estetyka i porządki w kodzie',
  'Docker, serwer, domena i spokojne utrzymanie po wdrożeniu',
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
          <a href="#skills">Umiejętności</a>
          <a href="#apps">Aplikacje</a>
          <a href="#life">Po godzinach</a>
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
              Vibecoder · Analityk danych · Fotograf
            </motion.div>
            <motion.h1 variants={fade}>
              Vibecoduję strony, układam dane w sens i łapię świat w kadr.
            </motion.h1>
            <motion.p className="hero-lead" variants={fade}>
              Cześć, jestem Adam. Nie jestem klasycznym programistą — poza HTML i CSS nie piszę
              w żadnym języku. Ale z pomocą AI buduję realnie działające strony i aplikacje,
              ogarniam Dockera, SSH i serwery, a na co dzień analizuję dane w Power BI, Looker
              Studio i Excelu. Po godzinach fotografuję, śledzę lotnictwo i planuję kolejne podróże.
            </motion.p>
            <motion.div className="hero-actions" variants={fade}>
              <a className="primary-action" href="#apps">Zobacz, co zbudowałem</a>
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
              <div><strong>WEB</strong><span>strony i aplikacje</span></div>
              <div><strong>DATA</strong><span>raporty i KPI</span></div>
              <div><strong>PHOTO</strong><span>kadry z podróży</span></div>
              <div><strong>AIR</strong><span>lotnictwo i mapy</span></div>
            </div>
          </motion.aside>
        </section>

        <section className="tool-strip" aria-label="Narzędzia">
          <div className="tool-track">
            {[...tools, ...tools].map((tool, index) => (
              <span key={`${tool}-${index}`}>{tool}</span>
            ))}
          </div>
        </section>

        <motion.section
          id="skills"
          className="content-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Co potrafię"
            title="Buduję, wdrażam i analizuję — z głową, nie z dyplomem informatyka."
            text="Nie udaję inżyniera od niskopoziomowego kodu. Moja siła to łączenie narzędzi, AI i zdrowego rozsądku tak, żeby na końcu coś po prostu działało."
          />

          <div className="capability-grid">
            {skills.map(({ icon: Icon, title, text }) => (
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
            kicker="Co zbudowałem"
            title="Aplikacje, które naprawdę działają na moim serwerze."
            text="To nie są makiety ani szkice z portfolio. To zestaw usług, które sam postawiłem, spiąłem Dockerem i utrzymuję."
          />
          <div className="apps-grid">
            {liveApps.map((app) => <AppCard key={app.name} app={app} />)}
          </div>
        </motion.section>

        <motion.section
          id="life"
          className="content-section life-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Po godzinach"
            title="Poza ekranem najbardziej kocham latać myślami i podróżować naprawdę."
            text="To nie jest część oferty — to po prostu ja. Często zresztą przecieka do tego, co buduję."
          />
          <div className="case-grid">
            {passions.map(({ icon: Icon, label, text }) => (
              <motion.article className="case-card" key={label} variants={fade}>
                <span><Icon size={15} /> {label}</span>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="content-section craft-section"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <SectionHeader
            kicker="Jak pracuję"
            title="Szybko do działającego prototypu, potem spokojnie do porządku."
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
                <Wand2 />
                <Container />
                <TerminalSquare />
                <Camera />
                <Plane />
                <LineChart />
              </div>
              <h3>Łączę rzeczy, które rzadko chodzą w parze — i to jest moja przewaga.</h3>
              <p>
                Analityka uczy dyscypliny, fotografia kompozycji, lotnictwo procedur,
                a AI daje tempo. Z tego miksu powstają projekty uporządkowane, dopracowane
                i po prostu przyjemne w użyciu — nawet jeśli zaczynam je bez ani jednej linijki
                napisanej „z głowy”.
              </p>
            </motion.div>
          </div>
        </motion.section>

        <section className="content-section signal-section">
          <div className="signal-card">
            <Wand2 size={28} />
            <div>
              <span>Tak w skrócie</span>
              <h2>Daj mi pomysł, dane albo problem — a ja doprowadzę to do działającej strony na serwerze.</h2>
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
            <h2>Masz pomysł na stronę, dane do ogarnięcia albo po prostu chcesz pogadać?</h2>
            <p>
              Najfajniej pracuje mi się przy projektach, w których jest miejsce na estetykę,
              trochę danych i odrobinę kombinowania. Odezwij się — chętnie zobaczę, co da się z tego zrobić.
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
