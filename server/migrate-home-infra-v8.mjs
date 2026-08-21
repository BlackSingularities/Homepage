/**
 * Jednorazowo dokłada usługę "Infrastruktura domowa i smart home" do treści
 * produkcyjnej (usługi, marquee w hero, atuty, FAQ) oraz osobną podstronę
 * w pages.json. Dopisuje wyłącznie brakujące elementy — nie nadpisuje treści
 * już edytowanej w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const pagesFile = path.join(dataDir, 'pages.json')
const markerFile = path.join(dataDir, '.migration-home-infra-v8')
const contentBackup = path.join(dataDir, 'content.before-home-infra-v8.json')
const pagesBackup = path.join(dataDir, 'pages.before-home-infra-v8.json')

const defaultContent = JSON.parse(
  await fs.readFile(new URL('./content.default.json', import.meta.url), 'utf8'),
)

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

async function writeJson(file, data) {
  const temporary = `${file}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, file)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const defaultService = defaultContent.services.items.find(item => item.id === 'svc-home')
  const defaultMarqueeTag = 'Infrastruktura i smart home'
  const defaultStrength = 'Sieci, serwery domowe i smart home'
  const defaultFaqItem = defaultContent.faq.items.find(item => item.q.startsWith('Czy zajmujesz się też siecią'))

  const services = content.services || defaultContent.services
  const serviceItems = Array.isArray(services.items) ? services.items : []
  const nextServiceItems = serviceItems.some(item => item.id === 'svc-home')
    ? serviceItems
    : [...serviceItems, defaultService]

  const hero = content.hero || defaultContent.hero
  const marquee = Array.isArray(hero.marquee) ? hero.marquee : []
  const nextMarquee = marquee.includes(defaultMarqueeTag) ? marquee : [...marquee, defaultMarqueeTag]

  const about = content.about || defaultContent.about
  const strengths = Array.isArray(about.strengths) ? about.strengths : []
  const nextStrengths = strengths.includes(defaultStrength) ? strengths : [...strengths, defaultStrength]

  const faq = content.faq || defaultContent.faq
  const faqItems = Array.isArray(faq.items) ? faq.items : []
  const nextFaqItems = faqItems.some(item => item.q === defaultFaqItem.q)
    ? faqItems
    : [...faqItems, defaultFaqItem]

  const next = {
    ...content,
    hero: { ...hero, marquee: nextMarquee },
    services: { ...services, items: nextServiceItems },
    about: { ...about, strengths: nextStrengths },
    faq: { ...faq, items: nextFaqItems },
  }

  if (!await exists(contentBackup)) await fs.copyFile(contentFile, contentBackup)
  await writeJson(contentFile, next)
}

const pages = (await exists(pagesFile)) ? JSON.parse(await fs.readFile(pagesFile, 'utf8')) : []
const slug = 'infrastruktura-domowa'

if (!pages.some(page => page.slug === slug)) {
  const now = new Date().toISOString()
  const block = (type, fields) => ({ id: crypto.randomUUID(), type, ...fields })

  const page = {
    id: crypto.randomUUID(),
    slug,
    title: 'Infrastruktura domowa i smart home',
    kicker: 'Poza aplikacjami',
    excerpt: 'Serwery domowe, sieć, DNS i smart home — zaplecze, na którym Twoje projekty i dom działają bez przypadkowych ustawień.',
    lead: 'Poza pisaniem aplikacji stawiam też fizyczne i sieciowe zaplecze, na którym te aplikacje — i cały dom — mogą działać. Serwer, sieć, automatyzacje i prywatność, poukładane raz, a dobrze.',
    cover: '',
    seoDescription: 'Serwery domowe, self-hosting, smart home w Home Assistant, AdGuard Home i VPN — infrastruktura, którą projektuję i stawiam poza aplikacjami webowymi.',
    accent: 'mint',
    published: true,
    featured: true,
    order: pages.length,
    blocks: [
      block('text', {
        heading: 'Zaplecze, nie dodatek',
        body: 'Router na fabrycznych ustawieniach, smart home rozrzucony po kilku aplikacjach producentów, serwer bez kopii zapasowej — to najczęstszy stan domowej infrastruktury. Działa, dopóki coś nie zawiedzie.\nUkładam to raz, świadomie: sieć, serwer, automatyzacje i prywatność jako jeden spójny system, a nie zestaw przypadkowych urządzeń.',
        layout: 'default',
      }),
      block('features', {
        heading: 'Co realnie ogarniam',
        items: [
          {
            title: 'Serwery domowe i self-hosting',
            text: 'Docker, Proxmox, NAS, kopie zapasowe i porządna wirtualizacja — usługi, które hostujesz sam, bez płacenia za chmurę i bez utraty kontroli nad danymi.',
          },
          {
            title: 'Smart home i automatyzacje',
            text: 'Home Assistant jako centrum domu: integracja urządzeń różnych producentów, sceny, harmonogramy i automatyzacje, które realnie ułatwiają dzień, a nie dokładają kolejnych aplikacji.',
          },
          {
            title: 'DNS, reklamy i prywatność',
            text: 'AdGuard Home blokujący reklamy i śledzenie na poziomie całej sieci — działa dla każdego urządzenia w domu, bez instalowania czegokolwiek na telefonie czy laptopie.',
          },
          {
            title: 'Bezpieczny zdalny dostęp',
            text: 'VPN i sensowna segmentacja sieci, dzięki którym dostajesz się do domowych usług z zewnątrz bez wystawiania portów na świat i bez przypadkowych dziur w zabezpieczeniach.',
          },
        ],
      }),
      block('cta', {
        heading: 'Masz w domu chaos kabli i porzuconych pomysłów?',
        body: 'Opowiedz, co już stoi i czego brakuje — zaproponuję konkretny układ.',
        label: 'Napisz do mnie',
        href: '/#kontakt',
      }),
    ],
    createdAt: now,
    updatedAt: now,
  }

  if (!await exists(pagesBackup) && await exists(pagesFile)) await fs.copyFile(pagesFile, pagesBackup)
  await writeJson(pagesFile, [...pages, page])
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
