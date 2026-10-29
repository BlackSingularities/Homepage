import { createContext, useCallback, useContext } from 'react'

/**
 * Dwie wersje językowe strony. Polska stoi w korzeniu adresów, angielska
 * pod prefiksem `/en` – te same ścieżki i te same slugi, więc przełącznik
 * języka zawsze trafia w odpowiednik bieżącej podstrony.
 */

export const LANGS = ['pl', 'en']
export const DEFAULT_LANG = 'pl'
export const LOCALE = { pl: 'pl-PL', en: 'en-GB' }
export const LANG_NAME = { pl: 'Polski', en: 'English' }

/** `/en/portfolio/x` → { lang: 'en', path: '/portfolio/x' }. */
export function splitLang(pathname = '/') {
  const clean = String(pathname || '/')
  if (clean === '/en' || clean.startsWith('/en/')) return { lang: 'en', path: clean.slice(3) || '/' }
  return { lang: DEFAULT_LANG, path: clean || '/' }
}

/** Ścieżka w danym języku. Kotwica i zapytanie zostają na końcu. */
export function localePath(target, lang) {
  const value = String(target || '/')
  if (lang !== 'en' || !value.startsWith('/') || value.startsWith('//')) return value
  if (value === '/en' || value.startsWith('/en/') || value.startsWith('/en#')) return value
  if (/^\/(uploads|assets|api|galeria|admin)(\/|$)/.test(value)) return value
  if (value === '/' || value.startsWith('/#') || value.startsWith('/?')) return `/en${value.slice(1)}`
  return `/en${value}`
}

export const LangContext = createContext(DEFAULT_LANG)
export const useLang = () => useContext(LangContext)

/** Polska odmiana: 1 pozycja, 2 pozycje, 5 pozycji. */
function polishPlural(count, one, few, many) {
  if (count === 1) return one
  const rest = count % 10
  const teens = count % 100
  if (rest >= 2 && rest <= 4 && (teens < 12 || teens > 14)) return few
  return many
}

const number = (lang, value) => new Intl.NumberFormat(LOCALE[lang]).format(Number(value) || 0)

export const STRINGS = {
  pl: {
    'nav.main': 'Główna',
    'nav.footer': 'Stopka',
    'nav.offer': 'Oferta',
    'nav.process': 'Proces',
    'nav.portfolio': 'Portfolio',
    'nav.about': 'O mnie',
    'nav.contact': 'Kontakt',
    'nav.menu': 'Menu',
    'nav.language': 'Język strony',
    'footer.privacy': 'Ustawienia prywatności',
    'loading': 'Wczytuję…',

    'kind.web': 'Strona',
    'kind.app': 'Aplikacja',
    'platform.other': 'Plik',
    'items': n => `${n} ${polishPlural(n, 'pozycja', 'pozycje', 'pozycji')}`,
    'downloads': n => `${number('pl', n)} ${polishPlural(n, 'pobranie', 'pobrania', 'pobrań')}`,

    'hero.more': (cta, n) => `${cta}: jeszcze ${n} ${polishPlural(n, 'pozycja', 'pozycje', 'pozycji')}`,
    'catalog.count': n => `${n} ${polishPlural(n, 'pozycja', 'pozycje', 'pozycji')} w portfolio`,
    'catalog.filters': 'Rodzaj pracy',
    'catalog.empty': 'Nic tu jeszcze nie ma.',
    'register.empty': 'Portfolio jest jeszcze puste.',
    'register.onRequest': 'dostęp na życzenie',
    'pages.details': 'Zobacz szczegóły',

    'project.loading': 'Wczytuję realizację…',
    'project.missing': 'Tej pracy nie ma w portfolio albo nie jest opublikowana.',
    'project.backToPortfolio': 'Wróć do portfolio',
    'project.open': kind => `Otwórz ${kind === 'app' ? 'stronę' : 'serwis'}`,
    'project.private': 'Adres nie jest publiczny – prezentacja na życzenie.',
    'project.features': 'Funkcje',
    'project.stack': 'Technologie',
    'project.role': 'Mój udział',
    'project.downloads': 'Do pobrania',
    'project.stores': 'Pobierz ze sklepu',
    'project.storeCta': 'Pobierz z',
    'project.noRelease': 'Wydanie publiczne jeszcze nie jest gotowe. Napisz, jeśli chcesz zobaczyć wersję roboczą.',
    'project.released': date => `wydane ${date}`,
    'project.history': 'co nowego',
    'project.changelog': 'Historia zmian',
    'project.prerelease': 'wersja testowa',
    'project.downloadCount': 'Liczba pobrań',
    'project.shots': name => `Zrzuty ekranu: ${name}`,
    'project.shot': (name, n) => `${name} – ekran ${n}`,
    'project.others': 'Inne prace',
    'project.previous': 'Poprzednia',
    'project.next': 'Następna',

    'page.loading': 'Wczytuję stronę…',
    'page.missing': 'Ta strona nie istnieje albo została ukryta.',
    'page.backHome': 'Wróć na stronę główną',
    'page.home': 'Strona główna',
    'page.footKicker': 'Masz podobny projekt?',
    'page.footTitle': 'Opisz go w kilku zdaniach –',
    'page.footAccent': 'resztą zajmę się ja',
    'page.footCta': 'Przejdź do formularza',

    'lightbox.label': (name, n, total) => `${name}: zrzut ${n} z ${total}`,
    'lightbox.close': 'Zamknij',
    'lightbox.prev': 'Poprzednie zdjęcie',
    'lightbox.next': 'Następne zdjęcie',

    'cookie.label': 'Ustawienia prywatności',
    'cookie.title': 'Statystyki odwiedzin',
    'cookie.text': 'Strona zapisuje w przeglądarce losowy identyfikator, żeby policzyć unikalne wizyty, źródła wejść i czas na stronie. Dane zostają na moim serwerze, bez reklam i firm trzecich. Bez zgody liczę tylko anonimowe odsłony i pobrania.',
    'cookie.deny': 'Tylko niezbędne',
    'cookie.accept': 'Akceptuję',

    'form.budgets': ['do 10 000 zł', '10 000 – 25 000 zł', '25 000 – 60 000 zł', 'powyżej 60 000 zł', 'do ustalenia'],
    'form.timelines': ['jak najszybciej', '1 – 3 miesiące', 'ponad 3 miesiące', 'zbieram informacje'],
    'form.failed': 'Nie udało się wysłać wiadomości.',
    'form.sent': 'Wiadomość dotarła. Wrócę do Ciebie możliwie szybko.',
    'form.thanks': 'Dziękuję.',
    'form.myTurn': 'Teraz moja kolej.',
    'form.again': 'Wyślij kolejną wiadomość',
    'form.introTitle': 'Kilka konkretów wystarczy.',
    'form.introText': 'Nie potrzebujesz gotowej specyfikacji. Opisz cel albo problem – resztę uporządkujemy wspólnie.',
    'form.stepProject': 'Projekt',
    'form.stepContact': 'Kontakt',
    'form.stepProjectHint': 'Cel, zakres i termin',
    'form.stepContactHint': 'Dane do odpowiedzi',
    'form.privacy': 'Dane służą wyłącznie do odpowiedzi na zapytanie.',
    'form.step': n => `Krok ${n} z 2`,
    'form.projectTitle': 'Opowiedz o projekcie.',
    'form.contactTitle': 'Jak mogę się z Tobą skontaktować?',
    'form.projectLead': 'Wybierz to, co już wiesz. Budżet i termin możesz zostawić do wspólnego ustalenia.',
    'form.contactLead': 'Potrzebuję tylko danych niezbędnych do udzielenia odpowiedzi.',
    'form.subject': 'Temat projektu',
    'form.subjectPlaceholder': 'Np. panel dla klientów albo autorski blog',
    'form.scope': 'Czego potrzebujesz?',
    'form.budget': 'Orientacyjny budżet',
    'form.timeline': 'Termin',
    'form.message': 'Najważniejsza informacja *',
    'form.messagePlaceholder': 'Co dziś nie działa, czego potrzebują użytkownicy i jaki efekt chcesz osiągnąć?',
    'form.messageError': 'Napisz kilka zdań – minimum 12 znaków.',
    'form.hint': 'Odpowiedz tylko na tyle, ile wiesz na tym etapie.',
    'form.next': 'Przejdź do kontaktu',
    'form.name': 'Imię i nazwisko *',
    'form.namePlaceholder': 'Jak mam się do Ciebie zwracać?',
    'form.company': 'Firma',
    'form.optional': 'Opcjonalnie',
    'form.email': 'E-mail *',
    'form.emailPlaceholder': 'Adres do odpowiedzi',
    'form.phone': 'Telefon',
    'form.phonePlaceholder': '+48…',
    'form.method': 'Preferowany sposób odpowiedzi',
    'form.byEmail': 'Mailowo',
    'form.byPhone': 'Telefonicznie',
    'form.website': 'Strona internetowa',
    'form.consent': 'Zgadzam się na kontakt w sprawie przesłanego zapytania.',
    'form.back': 'Wróć do projektu',
    'form.sending': 'Wysyłam',
    'form.send': 'Wyślij wiadomość',
    'form.invalid': 'Uzupełnij zaznaczone pola, żeby wysłać wiadomość.',

    'seo.homeTitle': 'Adam Rędzikowski – strony, aplikacje i programy na zamówienie',
    'seo.homeDescription': 'Strony internetowe, aplikacje webowe i programy na komputer oraz telefon projektowane i budowane od zera. Analiza, interfejs, kod, wdrożenie i dalszy rozwój u jednej osoby. Łódź i zdalnie.',
    'seo.catalogTitle': 'Portfolio – strony, aplikacje i programy | Adam Rędzikowski',
    'seo.catalogDescription': 'Portfolio Adama Rędzikowskiego: działające serwisy internetowe do otwarcia w przeglądarce oraz aplikacje na Androida, iOS i Windows do pobrania z najnowszych wydań.',
    'seo.notFound': 'Nie znaleziono strony | Adam Rędzikowski',
  },

  en: {
    'nav.main': 'Main',
    'nav.footer': 'Footer',
    'nav.offer': 'Services',
    'nav.process': 'Process',
    'nav.portfolio': 'Portfolio',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'nav.language': 'Site language',
    'footer.privacy': 'Privacy settings',
    'loading': 'Loading…',

    'kind.web': 'Website',
    'kind.app': 'App',
    'platform.other': 'File',
    'items': n => `${n} ${n === 1 ? 'project' : 'projects'}`,
    'downloads': n => `${number('en', n)} ${Number(n) === 1 ? 'download' : 'downloads'}`,

    'hero.more': (cta, n) => `${cta}: ${n} more ${n === 1 ? 'project' : 'projects'}`,
    'catalog.count': n => `${n} ${n === 1 ? 'project' : 'projects'} in the portfolio`,
    'catalog.filters': 'Type of work',
    'catalog.empty': 'Nothing here yet.',
    'register.empty': 'The portfolio is still empty.',
    'register.onRequest': 'access on request',
    'pages.details': 'See details',

    'project.loading': 'Loading project…',
    'project.missing': 'This project is not in the portfolio or has not been published.',
    'project.backToPortfolio': 'Back to the portfolio',
    'project.open': kind => `Open ${kind === 'app' ? 'website' : 'the service'}`,
    'project.private': 'The address is not public – demo available on request.',
    'project.features': 'Features',
    'project.stack': 'Technology',
    'project.role': 'My role',
    'project.downloads': 'Downloads',
    'project.stores': 'Get it from the store',
    'project.storeCta': 'Get it on',
    'project.noRelease': 'The public release is not ready yet. Get in touch if you would like to see a preview build.',
    'project.released': date => `released ${date}`,
    'project.history': "what's new",
    'project.changelog': 'Changelog',
    'project.prerelease': 'pre-release',
    'project.downloadCount': 'Downloads',
    'project.shots': name => `Screenshots: ${name}`,
    'project.shot': (name, n) => `${name} – screen ${n}`,
    'project.others': 'Other projects',
    'project.previous': 'Previous',
    'project.next': 'Next',

    'page.loading': 'Loading page…',
    'page.missing': 'This page does not exist or has been hidden.',
    'page.backHome': 'Back to the home page',
    'page.home': 'Home',
    'page.footKicker': 'Have a similar project?',
    'page.footTitle': 'Describe it in a few sentences –',
    'page.footAccent': "I'll take care of the rest",
    'page.footCta': 'Go to the contact form',

    'lightbox.label': (name, n, total) => `${name}: screenshot ${n} of ${total}`,
    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous image',
    'lightbox.next': 'Next image',

    'cookie.label': 'Privacy settings',
    'cookie.title': 'Visit statistics',
    'cookie.text': 'This site stores a random identifier in your browser to count unique visits, traffic sources and time spent on the page. The data stays on my own server – no ads, no third parties. Without your consent I only count anonymous page views and downloads.',
    'cookie.deny': 'Essential only',
    'cookie.accept': 'Accept',

    'form.budgets': ['under €2,500', '€2,500 – €6,000', '€6,000 – €15,000', 'over €15,000', 'to be agreed'],
    'form.timelines': ['as soon as possible', '1 – 3 months', 'more than 3 months', 'just researching'],
    'form.failed': 'The message could not be sent.',
    'form.sent': "Your message has arrived. I'll get back to you as soon as possible.",
    'form.thanks': 'Thank you.',
    'form.myTurn': 'Now it’s my turn.',
    'form.again': 'Send another message',
    'form.introTitle': 'A few specifics are enough.',
    'form.introText': "You don't need a finished specification. Describe the goal or the problem – we'll sort out the rest together.",
    'form.stepProject': 'Project',
    'form.stepContact': 'Contact',
    'form.stepProjectHint': 'Goal, scope and timeline',
    'form.stepContactHint': 'How to reply',
    'form.privacy': 'Your details are used only to reply to your enquiry.',
    'form.step': n => `Step ${n} of 2`,
    'form.projectTitle': 'Tell me about the project.',
    'form.contactTitle': 'How can I get in touch with you?',
    'form.projectLead': 'Pick what you already know. Budget and timeline can be agreed together later.',
    'form.contactLead': 'I only need the details required to reply.',
    'form.subject': 'Project topic',
    'form.subjectPlaceholder': 'E.g. a customer portal or a custom blog',
    'form.scope': 'What do you need?',
    'form.budget': 'Approximate budget',
    'form.timeline': 'Timeline',
    'form.message': 'The most important information *',
    'form.messagePlaceholder': "What isn't working today, what do your users need and what result do you want to achieve?",
    'form.messageError': 'Write a few sentences – at least 12 characters.',
    'form.hint': 'Answer only as much as you know at this stage.',
    'form.next': 'Continue to contact details',
    'form.name': 'Full name *',
    'form.namePlaceholder': 'How should I address you?',
    'form.company': 'Company',
    'form.optional': 'Optional',
    'form.email': 'Email *',
    'form.emailPlaceholder': 'Address for the reply',
    'form.phone': 'Phone',
    'form.phonePlaceholder': '+44…',
    'form.method': 'Preferred way to reply',
    'form.byEmail': 'By email',
    'form.byPhone': 'By phone',
    'form.website': 'Website',
    'form.consent': 'I agree to be contacted about this enquiry.',
    'form.back': 'Back to the project',
    'form.sending': 'Sending',
    'form.send': 'Send message',
    'form.invalid': 'Please fill in the highlighted fields to send your message.',

    'seo.homeTitle': 'Adam Rędzikowski – Custom Websites, Web Apps & Software Developer',
    'seo.homeDescription': 'Freelance designer and developer building custom websites, web applications and desktop & mobile apps from scratch. Analysis, UX, code, launch and long-term care from one person. Based in Poland, working remotely worldwide.',
    'seo.catalogTitle': 'Portfolio – Websites, Web Apps & Mobile Apps | Adam Rędzikowski',
    'seo.catalogDescription': 'Portfolio of Adam Rędzikowski: live websites you can open in the browser and Android, iOS and Windows apps you can download straight from their latest releases.',
    'seo.notFound': 'Page not found | Adam Rędzikowski',
  },
}

export function translate(lang, key, ...args) {
  const value = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG][key]
  if (typeof value === 'function') return value(...args)
  return value ?? key
}

/** `t('klucz', ...argumenty)` w bieżącym języku plus `lp()` do adresów. */
export function useT() {
  const lang = useLang()
  const t = useCallback((key, ...args) => translate(lang, key, ...args), [lang])
  const lp = useCallback(path => localePath(path, lang), [lang])
  return { t, lp, lang }
}
