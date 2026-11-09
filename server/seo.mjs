/**
 * SEO po stronie serwera. Strona jest aplikacją React, ale każdy publiczny
 * adres dostaje tu własny <head> (tytuł, opis, canonical, hreflang, Open
 * Graph, dane strukturalne JSON-LD) oraz zwykły HTML z treścią w #root.
 * Roboty bez JavaScriptu – i podglądy linków w komunikatorach – widzą więc
 * pełną stronę, a przeglądarka i tak zastępuje ją aplikacją po starcie.
 */

export const SITE = 'https://redzikowski.com'
const AUTHOR = 'Adam Rędzikowski'
const GITHUB = 'https://github.com/BlackSingularities'
const OG_IMAGE = `${SITE}/og.png`
const LOGO = `${SITE}/assets/brand/favicon-r-512.png`

const T = {
  pl: {
    locale: 'pl_PL',
    homeTitle: 'Adam Rędzikowski – strony, aplikacje i programy na zamówienie',
    homeDescription: 'Strony internetowe, aplikacje webowe i programy na komputer oraz telefon projektowane i budowane od zera. Analiza, interfejs, kod, wdrożenie i dalszy rozwój u jednej osoby. Łódź i zdalnie.',
    catalogTitle: 'Portfolio – strony, aplikacje i programy | Adam Rędzikowski',
    catalogDescription: 'Portfolio Adama Rędzikowskiego: działające serwisy internetowe do otwarcia w przeglądarce oraz aplikacje na Androida, iOS i Windows do pobrania z najnowszych wydań.',
    suffix: 'Adam Rędzikowski',
    home: 'Strona główna',
    portfolio: 'Portfolio',
    offer: 'Oferta',
    contact: 'Kontakt',
    download: 'Pobierz',
    features: 'Funkcje',
    stack: 'Technologie',
    role: 'Mój udział',
    app: 'Aplikacja',
    web: 'Strona',
    jobTitle: 'Projektant i programista stron oraz aplikacji',
    serviceName: 'Adam Rędzikowski – strony i aplikacje na zamówienie',
    notFound: 'Nie znaleziono strony',
    notFoundText: 'Ta strona nie istnieje albo została ukryta.',
  },
  en: {
    locale: 'en_US',
    homeTitle: 'Adam Rędzikowski – Custom Websites, Web Apps & Software Developer',
    homeDescription: 'Freelance designer and developer building custom websites, web applications and desktop & mobile apps from scratch. Analysis, UX, code, launch and long-term care from one person. Based in Poland, working remotely worldwide.',
    catalogTitle: 'Portfolio – Websites, Web Apps & Mobile Apps | Adam Rędzikowski',
    catalogDescription: 'Portfolio of Adam Rędzikowski: live websites you can open in the browser and Android, iOS and Windows apps you can download straight from their latest releases.',
    suffix: 'Adam Rędzikowski',
    home: 'Home',
    portfolio: 'Portfolio',
    offer: 'Services',
    contact: 'Contact',
    download: 'Download',
    features: 'Features',
    stack: 'Technology',
    role: 'My role',
    app: 'Application',
    web: 'Website',
    jobTitle: 'Web & software designer and developer',
    serviceName: 'Adam Rędzikowski – custom websites and applications',
    notFound: 'Page not found',
    notFoundText: 'This page does not exist or has been hidden.',
  },
}

/* ── adresy ──────────────────────────────────────────────────────────── */

/** Rozbiera ścieżkę na język i widok – lustro routera w przeglądarce. */
export function parseRoute(pathname) {
  let clean = decodeSafe(String(pathname || '/').split('?')[0]).replace(/\/+$/, '') || '/'
  let lang = 'pl'
  if (clean === '/en' || clean.startsWith('/en/')) {
    lang = 'en'
    clean = clean.slice(3) || '/'
  }
  if (clean === '/do-pobrania' || clean.startsWith('/do-pobrania/')) return { lang, view: 'resources', slug: clean.slice(13), path: clean }
  if (clean === '/') return { lang, view: 'home', path: '/' }
  if (clean === '/portfolio' || clean === '/realizacje') return { lang, view: 'catalog', path: '/portfolio' }
  const project = clean.match(/^\/(?:portfolio|realizacje)\/([^/]+)$/)
  if (project) return { lang, view: 'project', slug: project[1], path: `/portfolio/${project[1]}` }
  const page = clean.match(/^\/p\/([^/]+)$/)
  if (page) return { lang, view: 'page', slug: page[1], path: `/p/${page[1]}` }
  return { lang, view: 'missing', path: clean }
}

function decodeSafe(value) {
  try { return decodeURIComponent(value) } catch { return value }
}

/** Ścieżka w danym języku: polski bez prefiksu, angielski pod /en. */
export const localePath = (path, lang) => (lang === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path)
const absolute = path => `${SITE}${encodeURI(path)}`
const asset = src => (!src ? '' : /^https?:/.test(src) ? src : `${SITE}${src}`)

/* ── pomocnicze ──────────────────────────────────────────────────────── */

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Opis do meta: jedna linia, ucięta na granicy słowa. */
function describe(text, max = 158) {
  const plain = String(text || '').replace(/\s+/g, ' ').trim()
  if (plain.length <= max) return plain
  const cut = plain.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:–-]+$/, '')}…`
}

const paragraphs = text => String(text || '')
  .split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
  .map(part => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('')

const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

const heading = (title, accent) => [title, accent].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

/* ── encje wspólne ───────────────────────────────────────────────────── */

function personEntity(lang, content) {
  const t = T[lang]
  return {
    '@type': 'Person',
    '@id': `${SITE}/#person`,
    name: AUTHOR,
    url: absolute(localePath('/', lang)),
    image: LOGO,
    jobTitle: t.jobTitle,
    description: content.about?.lead || '',
    address: { '@type': 'PostalAddress', addressLocality: 'Łódź', addressCountry: 'PL' },
    knowsAbout: content.about?.strengths || [],
    knowsLanguage: ['pl', 'en'],
    sameAs: [GITHUB],
  }
}

function serviceEntity(lang, content) {
  const t = T[lang]
  return {
    '@type': 'ProfessionalService',
    '@id': `${SITE}/#service`,
    name: t.serviceName,
    url: absolute(localePath('/', lang)),
    image: OG_IMAGE,
    logo: LOGO,
    description: t.homeDescription,
    founder: { '@id': `${SITE}/#person` },
    address: { '@type': 'PostalAddress', addressLocality: 'Łódź', addressRegion: 'łódzkie', addressCountry: 'PL' },
    geo: { '@type': 'GeoCoordinates', latitude: 51.7592, longitude: 19.456 },
    areaServed: [
      { '@type': 'Country', name: 'Poland' },
      { '@type': 'Place', name: lang === 'en' ? 'Worldwide (remote)' : 'Cały świat (zdalnie)' },
    ],
    availableLanguage: ['Polish', 'English'],
    knowsLanguage: ['pl', 'en'],
    ...(content.brand?.email ? { email: content.brand.email } : {}),
    ...(content.brand?.phone ? { telephone: content.brand.phone } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: content.scope ? heading(content.scope.title, content.scope.accent) : t.offer,
      itemListElement: (content.scope?.items || []).map(item => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: item.title, description: item.detail },
      })),
    },
    sameAs: [GITHUB],
  }
}

function websiteEntity(lang) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: `${SITE}/`,
    name: AUTHOR,
    inLanguage: ['pl-PL', 'en'],
    publisher: { '@id': `${SITE}/#person` },
    description: T[lang].homeDescription,
  }
}

function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: absolute(path),
    })),
  }
}

const OS_NAMES = { windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS' }

/* ── widoki ──────────────────────────────────────────────────────────── */

function navHtml(lang, pages) {
  const t = T[lang]
  const link = (path, label) => `<a href="${escapeHtml(localePath(path, lang))}">${escapeHtml(label)}</a>`
  const other = lang === 'en' ? 'pl' : 'en'
  return `<header><nav>${[
    link('/', t.home),
    link('/portfolio', t.portfolio),
    ...pages.map(page => link(`/p/${page.slug}`, page.title)),
    `<a href="${escapeHtml(localePath('/', lang))}#kontakt">${escapeHtml(t.contact)}</a>`,
    `<a href="${escapeHtml(localePath('/', other))}" hreflang="${other}" lang="${other}">${other === 'en' ? 'English' : 'Polski'}</a>`,
  ].join(' · ')}</nav></header>`
}

function projectListHtml(lang, projects) {
  return `<ul>${projects.map(project => `<li><a href="${escapeHtml(localePath(`/portfolio/${project.slug}`, lang))}"><strong>${escapeHtml(project.name)}</strong></a> – ${escapeHtml(project.label || T[lang][project.kind] || '')}${project.tagline ? `. ${escapeHtml(project.tagline)}` : ''}</li>`).join('')}</ul>`
}

function homeView({ lang, content, pages, projects }) {
  const t = T[lang]
  const faq = content.faq?.items || []
  const body = `
    <main>
      <h1>${escapeHtml(heading(content.hero.titleTop, content.hero.titleAccent))}</h1>
      <p>${escapeHtml(content.hero.lead)}</p>
      <section><h2>${escapeHtml(heading(content.projects.title, content.projects.accent))}</h2>${projectListHtml(lang, projects)}</section>
      <section id="zakres"><h2>${escapeHtml(heading(content.scope.title, content.scope.accent))}</h2><p>${escapeHtml(content.scope.lead)}</p>
        <dl>${content.scope.items.map(item => `<dt>${escapeHtml(item.title)}</dt><dd>${escapeHtml(item.lead)} ${escapeHtml(item.detail)}</dd>`).join('')}</dl></section>
      <section id="proces"><h2>${escapeHtml(heading(content.process.title, content.process.accent))}</h2><ol>${content.process.items.map(step => `<li><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></li>`).join('')}</ol></section>
      ${pages.length ? `<section><h2>${escapeHtml(heading(content.pagesSection.title, content.pagesSection.accent))}</h2><ul>${pages.map(page => `<li><a href="${escapeHtml(localePath(`/p/${page.slug}`, lang))}">${escapeHtml(page.title)}</a> – ${escapeHtml(page.excerpt)}</li>`).join('')}</ul></section>` : ''}
      <section id="o-mnie"><h2>${escapeHtml(heading(content.about.title, content.about.accent))}</h2><p>${escapeHtml(content.about.lead)}</p>${paragraphs(content.about.text)}<ul>${content.about.strengths.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
      <section id="faq"><h2>${escapeHtml(heading(content.faq.title, content.faq.accent))}</h2>${faq.map(item => `<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join('')}</section>
      <section id="kontakt"><h2>${escapeHtml(heading(content.contact.title, content.contact.accent))}</h2><p>${escapeHtml(content.contact.lead)}</p></section>
    </main>`
  const graph = [
    websiteEntity(lang),
    personEntity(lang, content),
    serviceEntity(lang, content),
    {
      '@type': 'WebPage',
      '@id': `${absolute(localePath('/', lang))}#webpage`,
      url: absolute(localePath('/', lang)),
      name: t.homeTitle,
      description: t.homeDescription,
      inLanguage: lang === 'en' ? 'en' : 'pl-PL',
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${SITE}/#service` },
      primaryImageOfPage: OG_IMAGE,
    },
  ]
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${absolute(localePath('/', lang))}#faq`,
      inLanguage: lang === 'en' ? 'en' : 'pl-PL',
      mainEntity: faq.map(item => ({
        '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    })
  }
  return {
    title: t.homeTitle,
    description: t.homeDescription,
    body,
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
  }
}

function catalogView({ lang, content, projects }) {
  const t = T[lang]
  const url = absolute(localePath('/portfolio', lang))
  const body = `
    <main>
      <h1>${escapeHtml(heading(content.catalog.title, content.catalog.accent))}</h1>
      <p>${escapeHtml(content.catalog.lead)}</p>
      ${projectListHtml(lang, projects)}
    </main>`
  return {
    title: t.catalogTitle,
    description: t.catalogDescription,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${url}#webpage`,
          url,
          name: t.catalogTitle,
          description: t.catalogDescription,
          inLanguage: lang === 'en' ? 'en' : 'pl-PL',
          isPartOf: { '@id': `${SITE}/#website` },
          author: { '@id': `${SITE}/#person` },
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: projects.length,
            itemListElement: projects.map((project, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: absolute(localePath(`/portfolio/${project.slug}`, lang)),
              name: project.name,
            })),
          },
        },
        breadcrumbs([[t.home, localePath('/', lang)], [t.portfolio, localePath('/portfolio', lang)]]),
      ],
    },
  }
}

function projectView({ lang, project }) {
  const t = T[lang]
  const path = localePath(`/portfolio/${project.slug}`, lang)
  const url = absolute(path)
  const description = describe(project.tagline || project.summary || project.body)
  const isApp = project.kind === 'app'
  const systems = [...new Set((project.downloads || []).map(file => OS_NAMES[file.platform]).filter(Boolean))]
  const shots = (project.shots || []).map(shot => asset(shot.src))
  const body = `
    <main>
      <p><a href="${escapeHtml(localePath('/portfolio', lang))}">${escapeHtml(t.portfolio)}</a></p>
      <h1>${escapeHtml(project.name)}</h1>
      <p>${escapeHtml([isApp ? t.app : t.web, project.label].filter(Boolean).join(' · '))}</p>
      ${project.tagline ? `<p><strong>${escapeHtml(project.tagline)}</strong></p>` : ''}
      ${project.summary ? `<p>${escapeHtml(project.summary)}</p>` : ''}
      ${paragraphs(project.body)}
      ${(project.shots || []).map((shot, index) => `<img src="${escapeHtml(shot.src)}" alt="${escapeHtml(shot.alt || `${project.name} – ${index + 1}`)}" loading="lazy">`).join('')}
      ${project.features?.length ? `<h2>${t.features}</h2><ul>${project.features.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      ${project.stack?.length ? `<h2>${t.stack}</h2><ul>${project.stack.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      ${project.role ? `<h2>${t.role}</h2><p>${escapeHtml(project.role)}</p>` : ''}
      ${project.downloads?.length ? `<h2>${t.download}</h2><ul>${project.downloads.map(file => `<li><a href="${escapeHtml(file.url)}" rel="nofollow">${escapeHtml(OS_NAMES[file.platform] || file.label || file.platform)} ${escapeHtml(file.version || '')}</a></li>`).join('')}</ul>` : ''}
      ${project.siteUrl ? `<p><a href="${escapeHtml(project.siteUrl)}">${escapeHtml(project.siteUrl)}</a></p>` : ''}
      ${project.repo ? `<p><a href="https://github.com/${escapeHtml(project.repo)}">github.com/${escapeHtml(project.repo)}</a></p>` : ''}
    </main>`

  const software = {
    '@type': isApp ? 'SoftwareApplication' : 'WebApplication',
    '@id': `${url}#software`,
    name: project.name,
    url,
    description: project.summary || project.tagline || describe(project.body, 300),
    inLanguage: lang === 'en' ? 'en' : 'pl-PL',
    applicationCategory: isApp ? 'UtilitiesApplication' : 'WebApplication',
    operatingSystem: isApp ? (systems.join(', ') || 'Android') : 'Web browser',
    author: { '@id': `${SITE}/#person` },
    creator: { '@id': `${SITE}/#person` },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN', availability: 'https://schema.org/InStock' },
    ...(project.cover ? { image: asset(project.cover) } : {}),
    ...(shots.length ? { screenshot: shots } : {}),
    ...(project.features?.length ? { featureList: project.features.join(', ') } : {}),
    ...(project.release?.tag ? { softwareVersion: project.release.tag.replace(/^v/i, '') } : {}),
    ...(project.release?.publishedAt ? { datePublished: project.release.publishedAt.slice(0, 10) } : {}),
    ...(project.downloads?.length && project.downloads[0].url.startsWith('http') ? { downloadUrl: project.downloads[0].url } : {}),
    ...(project.repo ? { sameAs: [`https://github.com/${project.repo}`] } : {}),
    ...(project.siteUrl ? { installUrl: asset(project.siteUrl) } : {}),
    keywords: (project.stack || []).join(', '),
  }
  return {
    title: `${project.name} – ${project.label || (isApp ? t.app : t.web)} | ${t.suffix}`,
    description,
    image: asset(project.cover) || OG_IMAGE,
    type: 'article',
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        software,
        {
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: project.name,
          description,
          inLanguage: lang === 'en' ? 'en' : 'pl-PL',
          isPartOf: { '@id': `${SITE}/#website` },
          mainEntity: { '@id': `${url}#software` },
          dateModified: project.updatedAt,
        },
        breadcrumbs([
          [t.home, localePath('/', lang)],
          [t.portfolio, localePath('/portfolio', lang)],
          [project.name, path],
        ]),
      ],
    },
  }
}

function blockHtml(block, lang) {
  const h = block.heading ? `<h2>${escapeHtml(block.heading)}</h2>` : ''
  switch (block.type) {
    case 'image': return block.src ? `<figure><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" loading="lazy">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>` : ''
    case 'gallery': return `${h}${(block.images || []).map(image => `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy">`).join('')}`
    case 'features': return `${h}${(block.items || []).map(item => `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p>`).join('')}`
    case 'stats': return `${h}<ul>${(block.items || []).map(item => `<li><strong>${escapeHtml(item.value)}</strong> ${escapeHtml(item.label)}</li>`).join('')}</ul>`
    case 'quote': return `<blockquote>${escapeHtml(block.body)}${block.author ? `<cite>${escapeHtml(block.author)}</cite>` : ''}</blockquote>`
    case 'cta': return `<h2>${escapeHtml(block.heading)}</h2><p>${escapeHtml(block.body)}</p><a href="${escapeHtml(localizeHref(block.href, lang))}">${escapeHtml(block.label)}</a>`
    default: return `${h}${paragraphs(block.body)}`
  }
}

/** Wewnętrzne linki z podstron prowadzą do tej samej wersji językowej. */
export function localizeHref(href, lang) {
  const value = String(href || '')
  if (lang !== 'en' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/en')) return value
  if (/^\/(uploads|assets|api|galeria)\b/.test(value)) return value
  if (value === '/' || value.startsWith('/#') || value.startsWith('/?')) return `/en${value.slice(1)}`
  return `/en${value}`
}

function pageView({ lang, page }) {
  const t = T[lang]
  const path = localePath(`/p/${page.slug}`, lang)
  const url = absolute(path)
  const description = describe(page.seoDescription || page.lead || page.excerpt)
  const services = (page.blocks || []).filter(block => block.type === 'features').flatMap(block => block.items || [])
  const body = `
    <main>
      <p><a href="${escapeHtml(localePath('/', lang))}">${escapeHtml(t.home)}</a></p>
      <h1>${escapeHtml(page.title)}</h1>
      ${page.lead ? `<p>${escapeHtml(page.lead)}</p>` : ''}
      ${page.cover ? `<img src="${escapeHtml(page.cover)}" alt="${escapeHtml(page.title)}">` : ''}
      ${(page.blocks || []).map(block => `<section>${blockHtml(block, lang)}</section>`).join('')}
    </main>`
  return {
    title: `${page.title} | ${t.suffix}`,
    description,
    image: asset(page.cover) || OG_IMAGE,
    type: 'article',
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: page.title,
          headline: page.title,
          description,
          inLanguage: lang === 'en' ? 'en' : 'pl-PL',
          isPartOf: { '@id': `${SITE}/#website` },
          author: { '@id': `${SITE}/#person` },
          ...(page.cover ? { primaryImageOfPage: asset(page.cover) } : {}),
          dateModified: page.updatedAt,
          datePublished: page.createdAt,
        },
        {
          '@type': 'Service',
          '@id': `${url}#service`,
          name: page.title,
          description: page.lead || description,
          provider: { '@id': `${SITE}/#service` },
          areaServed: lang === 'en' ? 'Worldwide' : 'PL',
          ...(services.length ? {
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: page.title,
              itemListElement: services.map(item => ({
                '@type': 'Offer', itemOffered: { '@type': 'Service', name: item.title, description: item.text },
              })),
            },
          } : {}),
        },
        breadcrumbs([[t.home, localePath('/', lang)], [page.title, path]]),
      ],
    },
  }
}

function missingView({ lang }) {
  const t = T[lang]
  return {
    title: `${t.notFound} | ${t.suffix}`,
    description: t.notFoundText,
    body: `<main><h1>${escapeHtml(t.notFound)}</h1><p>${escapeHtml(t.notFoundText)}</p><p><a href="${escapeHtml(localePath('/', lang))}">${escapeHtml(t.home)}</a></p></main>`,
    noindex: true,
    status: 404,
  }
}

/* ── dokument ────────────────────────────────────────────────────────── */

/**
 * Składa gotowy HTML z szablonu Vite. `load` dostarcza dane dla języka;
 * `translated` mówi, czy dany widok ma wersję angielską (hreflang wskazuje
 * tylko istniejące odpowiedniki).
 */
export async function renderDocument(template, pathname, load) {
  const route = parseRoute(pathname)
  const { lang } = route
  const data = await load(route)
  let view
  if (route.view === 'home') view = homeView({ lang, ...data })
  else if (route.view === 'catalog') view = catalogView({ lang, ...data })
  else if (route.view === 'resources') view = resourcesView(route, data.resources || [])
  else if (route.view === 'project' && data.project) view = projectView({ lang, ...data })
  else if (route.view === 'page' && data.page) view = pageView({ lang, ...data })
  else view = missingView({ lang })

  const t = T[lang]
  const canonical = absolute(localePath(route.path, lang))
  const alternates = view.status === 404 ? [] : [
    ['pl', absolute(localePath(route.path, 'pl'))],
    ['en', absolute(localePath(route.path, 'en'))],
    ['x-default', absolute(localePath(route.path, 'pl'))],
  ]
  const image = view.image || OG_IMAGE
  const head = [
    `<title>${escapeHtml(view.title)}</title>`,
    `<meta name="description" content="${escapeHtml(view.description)}" />`,
    `<meta name="author" content="${AUTHOR}" />`,
    `<meta name="robots" content="${view.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
    view.status === 404 ? '' : `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    ...alternates.map(([code, href]) => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}" />`),
    `<meta property="og:type" content="${view.type || 'website'}" />`,
    `<meta property="og:site_name" content="${AUTHOR}" />`,
    `<meta property="og:locale" content="${t.locale}" />`,
    `<meta property="og:locale:alternate" content="${lang === 'en' ? T.pl.locale : T.en.locale}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(view.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(view.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(view.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(view.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(view.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    view.jsonLd ? jsonLd(view.jsonLd) : '',
  ].filter(Boolean).join('\n    ')

  const prerender = `<div class="prerender" data-prerender>${navHtml(lang, data.pages || [])}${view.body}</div>`

  const html = template
    .replace(/<html lang="[^"]*"/, `<html lang="${lang === 'en' ? 'en' : 'pl'}"`)
    .replace(/<!-- seo -->[\s\S]*?<!-- \/seo -->/, head)
    .replace('<div id="root"></div>', `<div id="root">${prerender}</div>`)

  return { html, status: view.status || 200 }
}

/* ── sitemap ─────────────────────────────────────────────────────────── */

export function renderSitemap({ pages, projects, resources = [], updatedAt }) {
  const entries = [
    { path: '/', lastmod: updatedAt, priority: '1.0', changefreq: 'weekly' },
    { path: '/do-pobrania', lastmod: updatedAt, priority: '0.8', changefreq: 'weekly' },
    ...resources.map(item => ({ path: `/do-pobrania/${item.slug}`, lastmod: item.updatedAt, priority: '0.7', changefreq: 'monthly' })),
    { path: '/portfolio', lastmod: updatedAt, priority: '0.9', changefreq: 'weekly' },
    ...projects.map(project => ({ path: `/portfolio/${project.slug}`, lastmod: project.updatedAt, priority: '0.8', changefreq: 'monthly', image: project.cover, images: project.shots })),
    ...pages.map(page => ({ path: `/p/${page.slug}`, lastmod: page.updatedAt, priority: '0.7', changefreq: 'monthly', image: page.cover })),
  ]
  const url = (entry, lang) => {
    const images = [entry.image, ...(entry.images || []).map(shot => shot.src)].filter(Boolean)
    return `  <url>
    <loc>${escapeHtml(absolute(localePath(entry.path, lang)))}</loc>
    ${entry.lastmod ? `<lastmod>${String(entry.lastmod).slice(0, 10)}</lastmod>` : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${lang === 'pl' ? entry.priority : (Number(entry.priority) - 0.1).toFixed(1)}</priority>
    <xhtml:link rel="alternate" hreflang="pl" href="${escapeHtml(absolute(localePath(entry.path, 'pl')))}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(absolute(localePath(entry.path, 'en')))}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(absolute(localePath(entry.path, 'pl')))}"/>
${[...new Set(images)].slice(0, 20).map(src => `    <image:image><image:loc>${escapeHtml(asset(src))}</image:loc></image:image>`).join('\n')}
  </url>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.flatMap(entry => [url(entry, 'pl'), url(entry, 'en')]).join('\n')}
</urlset>
`
}

function resourcesView({ lang, slug }, items) {
  const item = slug ? items.find(i => i.slug === slug) : null
  if (slug && !item) return missingView({ lang })
  const title = item?.title || 'Do pobrania — Adam Rędzikowski'
  const description = item?.summary || 'Autorskie presety i materiały do pobrania.'
  const body = item
    ? `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${['description', 'instructions', 'requirements', 'license'].map(key => `<p>${escapeHtml(item[key])}</p>`).join('')}${item.files.map(f => `<p><a href="/api/resources/${escapeHtml(item.slug)}/files/${escapeHtml(f.id)}">${escapeHtml(f.name)}</a></p>`).join('')}`
    : `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${items.map(i => `<article><h2><a href="${escapeHtml(localePath(`/do-pobrania/${i.slug}`, lang))}">${escapeHtml(i.title)}</a></h2><p>${escapeHtml(i.summary)}</p></article>`).join('')}`
  return { title, description, body: `<main>${body}</main>`, jsonLd: { '@context': 'https://schema.org', '@type': item ? 'CreativeWork' : 'CollectionPage', name: title, description } }
}
