import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AppWindow, ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, CircleAlert, CircleCheck, CircleDashed,
  Copy, Download, Eye, EyeOff, GitBranch, Globe, GripVertical, Images, KeyRound, LayoutGrid, Link2, LoaderCircle, Package, Plus,
  RefreshCw, Save, Search, Star, Trash2, Type, X,
} from 'lucide-react'
import { SEO_DESCRIPTION, SEO_TITLE, meterTone, readiness, seoDescriptionOf, seoTitleOf } from './readiness'
import { api, json, uid } from '../lib/api'
import {
  PLATFORM_LABEL, PLATFORM_ORDER, formatBytes, formatReleaseDate,
} from '../lib/projects'
import {
  Area, Dropzone, Empty, Notice, Field, GithubRefreshButton, ImagePicker, LangTabs, Repeater, SaveBar, Segmented, Select,
  Text, Toggle, toast, useMedia,
} from './parts'

/**
 * Portfolio. Dwa rodzaje treści, więc formularz pokazuje tylko to, co
 * dotyczy wybranego rodzaju: strona ma adres, aplikacja – repozytorium albo
 * ręczną listę plików. Wydania z GitHuba podglądamy tutaj, żeby błąd tokenu
 * albo brak uprawnień było widać przed publikacją, a nie na stronie.
 * Edytor jest podzielony na zakładki, żeby nie przewijać jednego długiego
 * formularza; wybrana zakładka zostaje przy przejściu do innej pracy.
 */

const KIND_OPTIONS = [
  ['web', 'Strona internetowa'],
  ['app', 'Aplikacja'],
]

const STORE_FIELDS = [
  ['google', 'Google Play', 'https://play.google.com/store/apps/details?id=…'],
  ['microsoft', 'Microsoft Store', 'https://apps.microsoft.com/detail/…'],
  ['apple', 'App Store', 'https://apps.apple.com/app/…'],
]

const RELEASE_OPTIONS = [
  ['github', 'Wydanie z GitHuba'],
  ['manual', 'Ręczna lista'],
  ['none', 'Bez plików'],
]

const SECTIONS = [
  ['basics', 'Podstawy', LayoutGrid],
  ['content', 'Treść', Type],
  ['media', 'Zdjęcia', Images],
  ['links', 'Linki i pliki', Link2],
  ['seo', 'SEO i Google', Globe],
]

function emptyProject() {
  return {
    name: 'Nowa praca',
    slug: '',
    kind: 'web',
    label: '',
    year: String(new Date().getFullYear()),
    tagline: '',
    summary: '',
    body: '',
    role: '',
    stack: [],
    features: [],
    icon: '',
    cover: '',
    shots: [],
    siteUrl: '',
    siteHidden: false,
    repo: '',
    repoHidden: true,
    releaseSource: 'none',
    stores: {},
    testing: { enabled: false, platforms: [] },
    downloads: [],
    seoTitle: '',
    seoDescription: '',
    keywords: [],
    category: '',
    faq: [],
    published: false,
    featured: false,
    en: emptyTranslation(),
  }
}

/**
 * Nowa praca na wzór istniejącej: rodzaj, technologie, mój udział, źródło
 * plików i kategoria przechodzą, treść i zdjęcia zaczynają się od zera.
 */
function projectFromTemplate(source) {
  return {
    ...emptyProject(),
    name: `${source.name} – kopia`,
    kind: source.kind,
    label: source.label,
    role: source.role,
    stack: [...(source.stack || [])],
    releaseSource: source.releaseSource,
    category: source.category || '',
    testing: { enabled: false, platforms: [...(source.testing?.platforms || [])] },
    en: { ...emptyTranslation(), label: source.en?.label || '', role: source.en?.role || '' },
  }
}

const TEST_PLATFORMS = { android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' }

function emptyTranslation() {
  return { label: '', tagline: '', summary: '', body: '', role: '', features: [], shotAlts: [], seoTitle: '', seoDescription: '', keywords: [], faq: [] }
}

/** Edytor listy prostych łańcuchów – jedna linia to jedna pozycja. */
function Lines({ label, value = [], onChange, hint, rows = 4 }) {
  const joined = value.join('\n')
  const [text, setText] = useState(joined)

  useEffect(() => {
    setText(current => (
      current.split('\n').map(line => line.trim()).filter(Boolean).join('\n') === joined ? current : joined
    ))
  }, [joined])

  return (
    <Field label={label} hint={hint || 'Każda linia to osobna pozycja.'} wide>
      <textarea
        rows={rows}
        value={text}
        onChange={event => {
          setText(event.target.value)
          onChange(event.target.value.split('\n').map(line => line.trim()).filter(Boolean))
        }}
      />
    </Field>
  )
}

/**
 * Zrzuty ekranu z opisami. Opis (alt) czytają wyszukiwarki grafiki i czytniki
 * ekranu, więc każdy zrzut ma pole po polsku i po angielsku. Angielskie opisy
 * leżą w `en.shotAlts` pod tym samym indeksem – przesuwanie zdjęć przesuwa oba.
 */
function Shots({ value = [], alts = [], name, onChange, onAdd }) {
  const { busy, progress, error, upload } = useMedia()
  const move = (index, step) => {
    const target = index + step
    if (target < 0 || target >= value.length) return
    const shots = [...value]
    const english = [...alts]
    ;[shots[index], shots[target]] = [shots[target], shots[index]]
    ;[english[index], english[target]] = [english[target] || '', english[index] || '']
    onChange(shots, english)
  }
  const remove = index => onChange(value.filter((_, at) => at !== index), alts.filter((_, at) => at !== index))
  const missing = value.filter(shot => !String(shot.alt || '').trim()).length
  return (
    <div className="ap-image-list">
      {error && <Notice tone="error">{error}</Notice>}
      <span className="ap-field-label">
        Zrzuty ekranu <b className="ap-count">{value.length}</b>
        {missing > 0 && <em className="ap-shots-missing">{missing === 1 ? '1 bez opisu' : `${missing} bez opisu`}</em>}
      </span>
      <ul className="ap-shot-list">
        {value.map((shot, index) => (
          <li key={`${shot.src}-${index}`}>
            <img src={shot.src} alt="" />
            <div className="ap-shot-fields">
              <label>
                <span>Opis zdjęcia</span>
                <input
                  value={shot.alt || ''}
                  placeholder={`${name} – co widać na ekranie`}
                  onChange={event => onChange(value.map((item, at) => (at === index ? { ...item, alt: event.target.value } : item)), alts)}
                />
              </label>
              <label>
                <span>Po angielsku</span>
                <input
                  value={alts[index] || ''}
                  placeholder={shot.alt || 'Screenshot description'}
                  onChange={event => {
                    const english = value.map((_, at) => alts[at] || '')
                    english[index] = event.target.value
                    onChange(value, english)
                  }}
                />
              </label>
            </div>
            <div className="ap-shot-tools">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Przesuń wyżej" title="Wyżej"><ArrowUp size={13} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label="Przesuń niżej" title="Niżej"><ArrowDown size={13} /></button>
              <button type="button" className="is-danger" onClick={() => remove(index)} aria-label="Usuń zdjęcie" title="Usuń"><Trash2 size={13} /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="ap-pe-shots">
        <Dropzone
          compact
          busy={busy}
          progress={progress}
          onFiles={async files => {
            const uploaded = await upload(files, file => onAdd({ src: file.url, alt: '' }))
            if (uploaded.length) {
              toast.success(`Dodano ${uploaded.length === 1 ? 'zdjęcie' : `zdjęcia: ${uploaded.length}`}. Dopisz opisy i zapisz pracę.`)
            }
          }}
        />
      </div>
    </div>
  )
}

/** Podgląd wydania pobranego z GitHuba – albo powód, dla którego go nie ma. */
function ReleasePreview({ release, busy, onRefresh }) {
  if (!release && !busy) return null
  return (
    <div className={`ap-release ${release?.error ? 'is-error' : ''}`}>
      <div className="ap-release-head">
        <strong>
          {busy && <LoaderCircle className="spin" size={14} />}
          {release?.error ? <CircleAlert size={14} /> : <Package size={14} />}
          {release?.error ? 'Nie udało się odczytać wydania' : release?.tag || 'Brak wydania'}
        </strong>
        <button type="button" className="ap-btn ap-btn-ghost ap-btn-sm" onClick={onRefresh} disabled={busy}>
          <RefreshCw size={13} /> Sprawdź ponownie
        </button>
      </div>
      {release?.error && <p className="ap-release-error">{release.error}</p>}
      {!release?.error && release?.publishedAt && (
        <p className="ap-hint">
          Wydane {formatReleaseDate(release.publishedAt)}
          {release.private ? ' · repozytorium prywatne, pliki pójdą przez serwer' : ' · repozytorium publiczne'}
        </p>
      )}
      {!!release?.assets?.length && (
        <ul className="ap-release-files">
          {[...release.assets]
            .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform))
            .map(asset => (
              <li key={asset.id}>
                <b>{PLATFORM_LABEL[asset.platform] || asset.platform}</b>
                <span>{asset.name}</span>
                <i>{formatBytes(asset.size)}</i>
              </li>
            ))}
        </ul>
      )}
      {!release?.error && release && !release.assets?.length && (
        <p className="ap-hint">To wydanie nie ma załączonych plików.</p>
      )}
    </div>
  )
}

/** Połączenie z GitHubem: bez tokenu czytamy tylko repozytoria publiczne. */
function GithubBar({ notify, onRefreshed }) {
  const [state, setState] = useState(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api('/api/admin/github').then(setState).catch(requestError => toast.error(requestError.message))
  }, [])

  const save = async (clear = false) => {
    setBusy(true)
    try {
      setState(await api('/api/admin/github', json('PUT', clear ? { clear: true } : { token })))
      setToken('')
      setOpen(false)
      notify(clear ? 'Token GitHuba został usunięty.' : 'Token GitHuba zapisany.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const tone = !state ? 'wait' : state.configured ? (state.ok ? 'ok' : 'error') : 'public'
  const status = {
    wait: 'Sprawdzam połączenie…',
    ok: `Token działa – konto ${state?.login}. Prywatne repozytoria są czytane.`,
    error: state?.error || 'Token nie działa.',
    public: 'Bez tokenu – tylko repozytoria publiczne.',
  }[tone]

  return (
    <div className={`ap-gh ${open ? 'is-open' : ''}`}>
      <div className="ap-gh-row">
        <span className={`ap-gh-dot is-${tone}`} />
        <GitBranch size={15} />
        <p><b>GitHub</b> <span>{status}</span></p>
        <div className="ap-gh-actions">
          <GithubRefreshButton compact onDone={onRefreshed} />
          <button type="button" className={`ap-btn ap-btn-ghost ap-btn-sm ${open ? 'is-active' : ''}`} onClick={() => setOpen(value => !value)}>
            {open ? <X size={14} /> : <KeyRound size={14} />} Token
          </button>
        </div>
      </div>
      {open && (
        <form className="ap-gh-token" onSubmit={event => { event.preventDefault(); if (token) save() }}>
          <Text
            label="Token dostępu (classic lub fine-grained)"
            type="password"
            value={token}
            onChange={setToken}
            placeholder={state?.configured ? '•••••••• – wpisz nowy, aby podmienić' : 'ghp_…'}
            hint="Wystarczy uprawnienie do odczytu zawartości repozytoriów. Token jest szyfrowany przed zapisem i nigdy nie opuszcza serwera."
          />
          <div className="ap-gh-actions">
            <button type="submit" className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy || !token}>
              <Save size={14} /> Zapisz token
            </button>
            {state?.configured && (
              <button type="button" className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => save(true)} disabled={busy}>
                <Trash2 size={14} /> Usuń token
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

/** Licznik znaków z zakresem, który Google pokazuje bez ucinania. */
function Counter({ value, min, max }) {
  const length = String(value || '').length
  const tone = !length ? '' : length < min ? 'is-short' : length > max ? 'is-long' : 'is-ok'
  const note = !length ? `${min}–${max} znaków` : length < min ? `za krótki o ${min - length}` : length > max ? `za długi o ${length - max}` : 'dobra długość'
  return <span className={`ap-counter ${tone}`}>{length} · {note}</span>
}

/** Tak mniej więcej wygląda wynik w Google – tytuł, adres, opis. */
function SerpPreview({ title, description, url }) {
  return (
    <figure className="ap-serp" aria-label="Podgląd wyniku w Google">
      <figcaption>Podgląd w wynikach wyszukiwania</figcaption>
      <div className="ap-serp-site">
        <img src="/assets/brand/favicon-r-32.png" alt="" />
        <span><b>Adam Rędzikowski</b><i>{url}</i></span>
      </div>
      <p className="ap-serp-title">{title.length > 62 ? `${title.slice(0, 60)}…` : title}</p>
      <p className="ap-serp-text">{description || 'Brak opisu – Google weźmie dowolny fragment strony.'}</p>
    </figure>
  )
}

/** Lista kontrolna wpisu: co jest gotowe i gdzie poprawić resztę. */
function Readiness({ report, onSection }) {
  return (
    <section className="ap-ready" aria-labelledby="ap-ready-title">
      <header>
        <h3 id="ap-ready-title">Gotowość wpisu</h3>
        <span className={`ap-meter ${meterTone(report.score)}`}><i style={{ '--value': `${report.score}%` }} />{report.done} z {report.total}</span>
      </header>
      <ul>
        {report.checks.map(check => (
          <li key={check.id} className={check.ok ? 'is-ok' : ''}>
            {check.ok ? <CircleCheck size={15} aria-label="Gotowe" /> : <CircleDashed size={15} aria-label="Do zrobienia" />}
            <span><b>{check.label}</b>{!check.ok && <small>{check.hint}</small>}</span>
            {!check.ok && (
              <button type="button" className="ap-btn ap-btn-sm" onClick={() => onSection(check.tab)}>Popraw</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SeoSection({ project, lang, setLang, value, set, original, categories, onSection }) {
  const title = seoTitleOf(project, lang)
  const description = seoDescriptionOf(project, lang)
  const url = `redzikowski.com › ${lang === 'en' ? 'en › ' : ''}portfolio › ${project.slug || '…'}`
  const faq = value('faq') || []
  return (
    <div className="ap-seo">
      <div className="ap-seo-main">
        <LangTabs
          value={lang}
          onChange={setLang}
          hint={lang === 'en' ? 'Wynik dla /en/portfolio/… – puste pola biorą polski tekst.' : 'Tak praca wygląda w Google i w podglądzie linku.'}
        />
        <SerpPreview title={title} description={description} url={url} />

        <div className="ap-field is-wide">
          <span className="ap-field-row">Tytuł w wynikach <Counter value={value('seoTitle')} {...SEO_TITLE} /></span>
          <input value={value('seoTitle') || ''} onChange={event => set('seoTitle', event.target.value)}
            placeholder={original('seoTitle') || `${project.name} – czym jest, w kilku słowach`} />
          <i>Nazwa na początku, potem to, co ktoś wpisze w wyszukiwarkę: „edytor PDF”, „mapa szlaków 3D”. Podpis autora doklei się sam, gdy zmieści.</i>
        </div>
        <div className="ap-field is-wide">
          <span className="ap-field-row">Opis w wynikach <Counter value={value('seoDescription')} {...SEO_DESCRIPTION} /></span>
          <textarea rows={3} value={value('seoDescription') || ''} onChange={event => set('seoDescription', event.target.value)}
            placeholder={original('seoDescription') || 'Co to jest, dla kogo i czym się wyróżnia – jedno, dwa zdania.'} />
          <i>Bez tego pola Google bierze zdanie z listy.</i>
        </div>

        <div className="ap-grid-2">
          <Lines key={`keywords-${lang}`} label="Słowa kluczowe" value={value('keywords') || []} onChange={next => set('keywords', next)} rows={5}
            hint="Jedna fraza w linii, tak jak ktoś by jej szukał. Trafiają do meta i danych strukturalnych." />
          <Select
            label="Kategoria programu"
            value={project.category || ''}
            onChange={category => set('category', category, true)}
            options={[['', 'Wybierz kategorię'], ...categories]}
            hint="Wspólna dla obu języków. Google używa jej przy wynikach z aplikacjami."
          />
        </div>

        <div className="ap-pe-group">
          <h3>Najczęstsze pytania</h3>
          <p className="ap-hint">Widać je pod opisem pracy i trafiają do danych FAQPage. Pisz tak, jak pytają ludzie: „Czy działa bez internetu?”.</p>
          <Repeater
            items={faq}
            onChange={next => set('faq', next)}
            create={() => ({ q: '', a: '' })}
            addLabel="Dodaj pytanie"
            itemLabel={(item, index) => item.q || `Pytanie ${index + 1}`}
            render={(item, patch) => (
              <>
                <Text label="Pytanie" value={item.q} onChange={q => patch({ q })} placeholder="Czy aplikacja jest darmowa?" />
                <Area label="Odpowiedź" value={item.a} onChange={a => patch({ a })} rows={2} placeholder="Konkretnie, w jednym lub dwóch zdaniach." />
              </>
            )}
          />
          {lang === 'en' && !faq.length && (original('faq') || []).length > 0 && (
            <p className="ap-hint">Bez angielskich pytań strona /en pokaże polskie.</p>
          )}
        </div>
      </div>
      <Readiness report={readiness(project)} onSection={onSection} />
    </div>
  )
}

function Editor({ project, platforms, categories, section, onSection, onChange, onSave, onDelete, onDuplicate, saving, dirty, saveExtra }) {
  const [release, setRelease] = useState(project.release || null)
  const [checking, setChecking] = useState(false)
  // Funkcyjna aktualizacja – wyniki wysyłki zdjęć wracają po kilku sekundach
  // i nie mogą nadpisać zmian zrobionych w tym czasie.
  const update = patch => onChange(current => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) }))
  const [lang, setLang] = useState('pl')
  const en = { ...emptyTranslation(), ...(project.en || {}) }
  // Pola tekstowe edytują wersję wybraną w zakładce języka; w angielskiej
  // podpowiedzią jest polski oryginał, a puste pole spada na niego na stronie.
  const value = key => (lang === 'en' ? en[key] : project[key])
  // `shared` – pole wspólne dla obu języków (np. kategoria).
  const set = (key, next, shared = false) => (lang === 'en' && !shared ? update({ en: { ...en, [key]: next } }) : update({ [key]: next }))
  const original = key => (lang === 'en' ? project[key] : undefined)

  useEffect(() => { setRelease(project.release || null) }, [project.id, project.release])

  const checkRelease = async () => {
    setChecking(true)
    try {
      setRelease(await api('/api/admin/github/release', json('POST', { repo: project.repo })))
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setChecking(false)
    }
  }

  const isApp = project.kind === 'app'
  const published = project.published !== false
  const thumb = project.icon || project.cover
  const releaseProblem = isApp && project.releaseSource === 'github' && release?.error
  const report = readiness(project)

  return (
    <div className="ap-pe">
      <header className="ap-pe-head">
        <span className="ap-pe-icon">{thumb ? <img src={thumb} alt="" /> : <AppWindow size={20} />}</span>
        <div className="ap-pe-title">
          <input
            className="ap-pe-name"
            value={project.name ?? ''}
            onChange={event => update({ name: event.target.value })}
            placeholder="Nazwa pracy"
            aria-label="Nazwa"
          />
          <span className="ap-pe-meta">
            <span className="mono">/portfolio/{project.slug || '…'}</span>
            <button type="button" className={`ap-meter ${meterTone(report.score)}`} onClick={() => onSection('seo')} title="Gotowość wpisu – otwórz listę kontrolną">
              <i style={{ '--value': `${report.score}%` }} />{report.score}%
            </button>
          </span>
        </div>
        <div className="ap-pe-tools">
          <button
            type="button"
            className={`ap-chip ${published ? 'is-live' : ''}`}
            onClick={() => update({ published: !published })}
            title="Dopóki wyłączone, praca jest widoczna tylko tutaj."
          >
            {published ? <Eye size={13} /> : <EyeOff size={13} />}
            {published ? 'Opublikowana' : 'Szkic'}
          </button>
          <button
            type="button"
            className={`ap-chip ${project.featured ? 'is-gold' : ''}`}
            onClick={() => update({ featured: !project.featured })}
            title="Strona główna pokazuje do pięciu wybranych prac."
          >
            <Star size={13} /> Na głównej
          </button>
          <span className="ap-pe-sep" />
          {project.slug && published && (
            <>
              <a className="ap-icon-btn ap-pe-lang" href={`/portfolio/${project.slug}`} target="_blank" rel="noreferrer" title="Podejrzyj wersję polską">
                PL<ArrowUpRight size={11} />
              </a>
              <a className="ap-icon-btn ap-pe-lang" href={`/en/portfolio/${project.slug}`} target="_blank" rel="noreferrer" title="Podejrzyj wersję angielską">
                EN<ArrowUpRight size={11} />
              </a>
            </>
          )}
          <button type="button" className="ap-icon-btn" onClick={onDuplicate} title="Nowa praca na wzór tej (rodzaj, technologie, kategoria)" aria-label="Nowa praca na wzór tej">
            <Copy size={14} />
          </button>
          <button type="button" className="ap-icon-btn is-danger" onClick={onDelete} title="Usuń pracę" aria-label="Usuń pracę">
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <nav className="ap-pe-tabs" role="tablist">
        {SECTIONS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={section === id ? 'is-active' : ''}
            onClick={() => onSection(id)}
          >
            <Icon size={14} /> {label}
            {id === 'links' && releaseProblem && <i className="ap-pe-alert" aria-label="Problem z wydaniem" />}
            {report.checks.some(check => check.tab === id && !check.ok) && <i className="ap-pe-todo" aria-label="Coś do uzupełnienia" />}
          </button>
        ))}
      </nav>

      <div className="ap-pe-body">
        {section === 'basics' && (
          <>
            <div className="ap-grid-2">
              <Text
                label="Adres pracy"
                value={project.slug}
                onChange={slug => update({ slug })}
                hint={`/portfolio/${project.slug || '…'}`}
              />
              <Segmented
                label="Rodzaj"
                value={project.kind}
                onChange={kind => update({ kind, releaseSource: kind === 'app' ? project.releaseSource : 'none' })}
                options={KIND_OPTIONS}
              />
            </div>
            <Lines label="Technologie" value={project.stack} onChange={stack => update({ stack })} rows={4}
              hint="Wspólne dla obu języków. Każda linia to osobna pozycja." />
          </>
        )}

        {section === 'content' && (
          <>
            <LangTabs
              value={lang}
              onChange={setLang}
              hint={lang === 'en'
                ? 'Wersja angielska (/en/portfolio/…). Puste pole = na stronie pokaże się polski tekst.'
                : 'Wersja polska – podstawowa.'}
            />
            <div className="ap-grid-2 ap-grid-label">
              <Text label="Etykieta" value={value('label')} onChange={next => set('label', next)} placeholder={original('label') || 'OSINT / analiza danych'} />
              <Text label="Zdanie na liście" value={value('tagline')} onChange={next => set('tagline', next)}
                placeholder={original('tagline')} hint="Jedno zdanie, które widać na liście." />
            </div>
            <Area label="Wprowadzenie" value={value('summary')} onChange={next => set('summary', next)} rows={2}
              placeholder={original('summary')} hint="Pierwszy, wyróżniony akapit na stronie pracy." />
            <Area label="Opis" value={value('body')} onChange={next => set('body', next)} rows={7}
              placeholder={original('body')} hint="Akapity rozdzielaj pustą linią." />
            <div className="ap-grid-2">
              <Text label="Mój udział" value={value('role')} onChange={next => set('role', next)}
                placeholder={original('role') || 'Analiza, projekt, wykonanie, wdrożenie i utrzymanie'} />
              <Lines key={`features-${lang}`} label="Funkcje" value={value('features')} onChange={next => set('features', next)} rows={4} />
            </div>
          </>
        )}

        {section === 'media' && (
          <>
            <div className="ap-pe-media">
              <ImagePicker label="Ikona aplikacji" value={project.icon} onChange={icon => update({ icon })}
                hint="Kwadratowa, z przezroczystym tłem – obok nazwy." />
              <ImagePicker label="Okładka na liście" value={project.cover} onChange={cover => update({ cover })}
                hint="Najlepiej poziomy zrzut ekranu – kadrowany do 16:10." />
            </div>
            <Shots
              value={project.shots}
              alts={en.shotAlts || []}
              name={project.name}
              onAdd={shot => update(current => ({ shots: [...(current.shots || []), shot] }))}
              onChange={(shots, shotAlts) => update(current => ({ shots, en: { ...emptyTranslation(), ...(current.en || {}), shotAlts } }))}
            />
          </>
        )}

        {section === 'links' && (
          <>
            <div className="ap-grid-2">
              <Text label="Adres działającej strony" value={project.siteUrl} onChange={siteUrl => update({ siteUrl })}
                placeholder="https://przyklad.pl albo /sciezka" />
              <Toggle
                label="Adres widoczny publicznie"
                hint="Wyłącz, żeby pokazać realizację bez linku – strona napisze, że prezentacja jest na życzenie."
                checked={!project.siteHidden}
                onChange={visible => update({ siteHidden: !visible })}
              />
            </div>

            {!isApp && (
              <p className="ap-pe-note">Pliki do pobrania i sklepy są dostępne dla rodzaju „Aplikacja” (zakładka Podstawy).</p>
            )}

            {isApp && (
              <>
                <div className="ap-pe-group">
                  <h3>Zapisy do testów</h3>
                  <Toggle
                    label="Szukam testerów"
                    hint="Strona aplikacji pokaże formularz z adresem e-mail. Zgłoszenia trafią do zakładki Testerzy."
                    checked={project.testing?.enabled === true}
                    onChange={enabled => update({ testing: { platforms: [], ...project.testing, enabled } })}
                  />
                  {project.testing?.enabled && (
                    <div className="ap-filters">
                      {Object.entries(TEST_PLATFORMS).map(([id, name]) => {
                        const platforms = project.testing.platforms || []
                        const on = platforms.includes(id)
                        return (
                          <button
                            type="button"
                            key={id}
                            className={on ? 'is-active' : ''}
                            aria-pressed={on}
                            onClick={() => update({ testing: { ...project.testing, platforms: on ? platforms.filter(item => item !== id) : [...platforms, id] } })}
                          >{name}</button>
                        )
                      })}
                    </div>
                  )}
                  {project.testing?.enabled && !project.testing.platforms?.length && (
                    <p className="ap-hint">Wybierz co najmniej jedną platformę – bez niej formularz się nie pokaże.</p>
                  )}
                </div>

                <div className="ap-pe-group">
                  <h3>Sklepy</h3>
                  <div className="ap-grid-3">
                    {STORE_FIELDS.map(([id, name, placeholder]) => (
                      <Text
                        key={id}
                        label={name}
                        value={project.stores?.[id] || ''}
                        onChange={url => update({ stores: { ...project.stores, [id]: url } })}
                        placeholder={placeholder}
                      />
                    ))}
                  </div>
                  <p className="ap-hint">
                    Link do sklepu zastępuje na stronie pliki do pobrania – zamiast plików z GitHuba
                    pojawią się plakietki sklepów. Kliknięcia w nie liczy analityka.
                  </p>
                </div>

                <div className="ap-pe-group">
                  <h3>Pliki do pobrania</h3>
                  <Segmented
                    value={project.releaseSource}
                    onChange={releaseSource => update({ releaseSource })}
                    options={RELEASE_OPTIONS}
                  />

                  {project.releaseSource === 'github' && (
                    <>
                      <div className="ap-grid-2">
                        <Text
                          label="Repozytorium"
                          value={project.repo}
                          onChange={repo => update({ repo })}
                          placeholder="owner/nazwa"
                          hint="Można wkleić cały adres z GitHuba – zostanie z niego owner/nazwa."
                        />
                        <Toggle
                          label="Pokaż link do repozytorium"
                          hint="Dla prywatnych repozytoriów zostaw wyłączone."
                          checked={!project.repoHidden}
                          onChange={visible => update({ repoHidden: !visible })}
                        />
                      </div>
                      <ReleasePreview release={release} busy={checking} onRefresh={checkRelease} />
                      {!release && !checking && (
                        <button type="button" className="ap-btn ap-btn-ghost ap-btn-sm" onClick={checkRelease} disabled={!project.repo}>
                          <Download size={14} /> Sprawdź najnowsze wydanie
                        </button>
                      )}
                    </>
                  )}

                  {project.releaseSource === 'manual' && (
                    <Repeater
                      items={project.downloads}
                      onChange={downloads => update({ downloads })}
                      create={() => ({ id: uid(), platform: 'windows', label: '', version: '', size: 0, url: '' })}
                      addLabel="Dodaj plik"
                      itemLabel={item => `${PLATFORM_LABEL[item.platform] || item.platform}${item.version ? ` ${item.version}` : ''}`}
                      render={(item, patch) => (
                        <>
                          <div className="ap-grid-3">
                            <Select
                              label="Platforma"
                              value={item.platform}
                              onChange={platform => patch({ platform })}
                              options={platforms}
                            />
                            <Text label="Wersja" value={item.version} onChange={version => patch({ version })} placeholder="1.4.2" />
                            <Text label="Rozmiar w bajtach" value={String(item.size || '')} onChange={size => patch({ size: Number(size) || 0 })} />
                          </div>
                          <div className="ap-grid-2">
                            <Text label="Adres pliku" value={item.url} onChange={url => patch({ url })} placeholder="https://…" />
                            <Text label="Opis pliku" value={item.label} onChange={label => patch({ label })} placeholder=".exe · instalator" />
                          </div>
                        </>
                      )}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}

        {section === 'seo' && (
          <SeoSection
            project={project}
            lang={lang}
            setLang={setLang}
            value={value}
            set={set}
            original={original}
            categories={categories}
            onSection={onSection}
          />
        )}
      </div>

      <SaveBar
        dirty={dirty || Boolean(saveExtra)}
        saving={saving}
        onSave={dirty ? onSave : undefined}
        saveLabel="Zapisz tę pracę"
        onReset={dirty ? () => onChange(null) : undefined}
        resetLabel="Odrzuć zmiany"
        info={saveExtra?.info || 'Ta praca ma niezapisane zmiany.'}
        extra={saveExtra?.button}
      />
    </div>
  )
}

/** Porównanie szkicu z zapisaną wersją – bez pól, które dokłada tylko serwer. */
const comparable = project => {
  const { release: _release, updatedAt: _updated, ...rest } = project || {}
  return JSON.stringify(rest)
}

export default function ProjectsManager({ notify, item = '', onItem = () => {} }) {
  const [projects, setProjects] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState('')
  // Szkice wszystkich edytowanych prac: przejście do innej pracy nie gubi zmian,
  // a zapisać można jedną albo wszystkie naraz.
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState('basics')
  const [query, setQuery] = useState('')

  const byId = useMemo(() => new Map((projects || []).map(project => [project.id, project])), [projects])
  const original = byId.get(selected) || null
  const draft = drafts[selected] || original

  const changed = useMemo(
    () => Object.entries(drafts).filter(([id, value]) => byId.has(id) && comparable(value) !== comparable(byId.get(id))).map(([id]) => id),
    [drafts, byId],
  )
  const dirty = changed.includes(selected)

  const load = async (keep = '') => {
    try {
      const payload = await api('/api/admin/projects')
      setProjects(payload.projects)
      setPlatforms(payload.platforms)
      setCategories(payload.categories || [])
      const next = keep || selected
      const current = payload.projects.find(entry => entry.id === next)
        || (!next && item ? payload.projects.find(entry => entry.slug === item) : null)
      setSelected(current ? current.id : '')
      if (current) onItem(current.slug)
      return payload.projects
    } catch (requestError) {
      toast.error(requestError.message)
      return null
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Zamknięcie karty z niezapisanymi pracami – przeglądarka zapyta.
  useEffect(() => {
    if (!changed.length) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changed.length])

  const choose = project => {
    setSelected(project.id)
    onItem(project.slug)
  }

  // „Wstecz” w przeglądarce zmienia adres – lista idzie za nim.
  useEffect(() => {
    if (!projects || !item) return
    const target = projects.find(entry => entry.slug === item)
    if (target && target.id !== selected) choose(target)
  }, [item, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const setDraft = next => setDrafts(current => {
    if (next === null) {
      const { [selected]: _dropped, ...rest } = current
      return rest
    }
    const base = current[selected] || structuredClone(byId.get(selected))
    return { ...current, [selected]: typeof next === 'function' ? next(base) : next }
  })

  const create = async (template = null) => {
    try {
      const created = await api('/api/admin/projects', json('POST', template ? projectFromTemplate(template) : emptyProject()))
      setQuery('')
      setSection(template ? 'content' : 'basics')
      await load(created.id)
      notify(template
        ? `Nowa praca na wzór „${template.name}”. Rodzaj, technologie i kategoria już są – uzupełnij treść.`
        : 'Praca dodana. Uzupełnij treść i opublikuj.')
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  // Zapisuje wskazane prace po kolei; błąd jednej nie przerywa pozostałych.
  const saveMany = useCallback(async ids => {
    if (!ids.length) return
    setSaving(true)
    const failed = []
    const saved = []
    for (const id of ids) {
      try {
        await api(`/api/admin/projects/${id}`, json('PUT', drafts[id]))
        saved.push(id)
      } catch (requestError) {
        failed.push(`${drafts[id]?.name || 'Praca'}: ${requestError.message}`)
      }
    }
    setDrafts(current => Object.fromEntries(Object.entries(current).filter(([id]) => !saved.includes(id))))
    await load(selected)
    setSaving(false)
    if (saved.length) notify(saved.length === 1 ? 'Praca zapisana.' : `Zapisano prace: ${saved.length}.`)
    if (failed.length) toast.error(`Nie zapisano: ${failed.join(' · ')}`)
  }, [drafts, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => saveMany([selected])
  const saveAll = () => saveMany(changed)

  // Ctrl+S / Cmd+S zapisuje wszystko, co zmienione.
  useEffect(() => {
    const onKey = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (changed.length && !saving) saveAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async () => {
    if (!window.confirm(`Usunąć „${draft.name}” z portfolio? Tego nie da się cofnąć.`)) return
    try {
      await api(`/api/admin/projects/${draft.id}`, { method: 'DELETE' })
      setDrafts(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== draft.id)))
      setSelected('')
      onItem('')
      await load()
      notify('Praca usunięta.')
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  // Przenosi pracę na wskazaną pozycję – krok w górę, skok na sam koniec
  // albo miejsce upuszczenia przy przeciąganiu.
  const moveTo = async (id, target) => {
    const ids = projects.map(entry => entry.id)
    const index = ids.indexOf(id)
    const clamped = Math.max(0, Math.min(target, ids.length - 1))
    if (index === -1 || clamped === index) return
    ids.splice(clamped, 0, ids.splice(index, 1)[0])
    setProjects(ids.map(entry => byId.get(entry)))
    try {
      setProjects(await api('/api/admin/projects/reorder', json('POST', { ids })))
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }
  const move = (id, direction) => moveTo(id, projects.findIndex(entry => entry.id === id) + direction)

  const [dragging, setDragging] = useState(null)
  const [dropAt, setDropAt] = useState(-1)

  if (!projects) {
    return <div className="ap-inline-loading"><LoaderCircle className="spin" size={18} /> Wczytuję portfolio…</div>
  }

  // Przy wyszukiwaniu kolejności nie zmieniamy – przefiltrowana lista nie
  // pokazuje sąsiadów, więc „wyżej” i „niżej” byłyby mylące.
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? projects.filter(project => [project.name, project.slug, project.label].some(text => text?.toLowerCase().includes(needle)))
    : projects
  const sortable = !needle
  const others = changed.filter(id => id !== selected)
  const saveExtra = changed.length > 1 || (changed.length === 1 && !dirty)
    ? {
      info: dirty
        ? `Niezapisane zmiany w ${changed.length} pracach.`
        : `Niezapisane zmiany w innych pracach: ${others.map(id => drafts[id]?.name).join(', ')}.`,
      button: (
        <button type="button" className={`ap-btn ${dirty ? '' : 'ap-btn-primary'}`} onClick={saveAll} disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Zapisz wszystkie ({changed.length})
        </button>
      ),
    }
    : null

  return (
    <div className="ap-projects">
      <GithubBar notify={notify} onRefreshed={() => load()} />

      <div className="ap-projects-layout">
        <aside className="ap-plist">
          <div className="ap-plist-head">
            <label className="ap-plist-search">
              <Search size={14} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Szukaj w ${projects.length} pracach`} />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Wyczyść"><X size={13} /></button>}
            </label>
            <button type="button" className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => create()} title="Dodaj pustą pracę">
              <Plus size={14} /> Dodaj
            </button>
          </div>

          <div className="ap-plist-scroll">
            {!projects.length && <Empty>Portfolio jest puste. Dodaj pierwszą pracę.</Empty>}
            {projects.length > 0 && !visible.length && <p className="ap-plist-none">Nic nie pasuje do „{query}”.</p>}

            {visible.map(stored => {
              const index = projects.indexOf(stored)
              const project = drafts[stored.id] || stored
              const unsaved = changed.includes(stored.id)
              const score = readiness(project).score
              return (
                <div
                  key={stored.id}
                  className={`ap-prow ${stored.id === selected ? 'is-active' : ''} ${dragging === stored.id ? 'is-dragging' : ''} ${dropAt === index && dragging && dragging !== stored.id ? 'is-drop' : ''}`}
                  draggable={sortable}
                  onDragStart={event => { setDragging(stored.id); event.dataTransfer.effectAllowed = 'move' }}
                  onDragOver={event => { if (!dragging) return; event.preventDefault(); setDropAt(index) }}
                  onDrop={event => { event.preventDefault(); if (dragging) moveTo(dragging, index); setDragging(null); setDropAt(-1) }}
                  onDragEnd={() => { setDragging(null); setDropAt(-1) }}
                >
                  {sortable && <GripVertical className="ap-prow-grip" size={14} aria-hidden="true" />}
                  <button type="button" className="ap-prow-pick" onClick={() => choose(stored)}>
                    <span className="ap-prow-thumb">
                      {project.icon || project.cover ? <img src={project.icon || project.cover} alt="" /> : <AppWindow size={14} />}
                    </span>
                    <span className="ap-prow-text">
                      <strong>{project.name || 'Bez nazwy'}</strong>
                      <small>
                        {project.kind === 'app' ? 'Aplikacja' : 'Strona'}
                        {project.label ? ` · ${project.label}` : ''}
                      </small>
                    </span>
                    <span className="ap-prow-flags">
                      {unsaved && <i className="ap-prow-unsaved" title="Niezapisane zmiany" aria-label="Niezapisane zmiany" />}
                      {project.release?.error && <CircleAlert className="is-error" size={13} aria-label="Problem z wydaniem" />}
                      {project.featured && <Star className="is-gold" size={13} aria-label="Na stronie głównej" />}
                      {project.published === false && <EyeOff size={13} aria-label="Nieopublikowana" />}
                      <b className={`ap-prow-score ${meterTone(score)}`} title={`Gotowość wpisu: ${score}%`}>{score}</b>
                    </span>
                  </button>
                  {sortable && (
                    <div className="ap-prow-order">
                      <button type="button" onClick={() => moveTo(stored.id, 0)} disabled={index === 0} aria-label="Na samą górę" title="Na samą górę"><ChevronsUp size={13} /></button>
                      <button type="button" onClick={() => move(stored.id, -1)} disabled={index === 0} aria-label="Wyżej" title="Wyżej"><ChevronUp size={13} /></button>
                      <button type="button" onClick={() => move(stored.id, 1)} disabled={index === projects.length - 1} aria-label="Niżej" title="Niżej"><ChevronDown size={13} /></button>
                      <button type="button" onClick={() => moveTo(stored.id, projects.length - 1)} disabled={index === projects.length - 1} aria-label="Na sam dół" title="Na sam dół"><ChevronsDown size={13} /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        <div className="ap-projects-form">
          {draft
            ? (
              <Editor
                key={draft.id}
                project={draft}
                platforms={platforms}
                categories={categories}
                section={section}
                onSection={setSection}
                onChange={setDraft}
                onSave={save}
                onDelete={remove}
                onDuplicate={() => create(draft)}
                saving={saving}
                dirty={dirty}
                saveExtra={saveExtra}
              />
            )
            : <Empty>Wybierz pracę z listy albo dodaj nową.</Empty>}
        </div>
      </div>
    </div>
  )
}
