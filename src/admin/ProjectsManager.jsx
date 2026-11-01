import { useEffect, useMemo, useState } from 'react'
import {
  AppWindow, ArrowUpRight, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, CircleAlert, Download, Eye, EyeOff,
  GitBranch, GripVertical, Images, KeyRound, LayoutGrid, Link2, LoaderCircle, Package, Plus, RefreshCw, Save,
  Search, Star, Trash2, Type, X,
} from 'lucide-react'
import { api, json, uid } from '../lib/api'
import {
  PLATFORM_LABEL, PLATFORM_ORDER, formatBytes, formatReleaseDate,
} from '../lib/projects'
import {
  Area, Dropzone, Empty, Field, GithubRefreshButton, ImagePicker, LangTabs, Repeater, SaveBar, Segmented, Select,
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
  ['media', 'Media', Images],
  ['links', 'Linki i pliki', Link2],
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
    downloads: [],
    published: false,
    featured: false,
    en: emptyTranslation(),
  }
}

function emptyTranslation() {
  return { label: '', tagline: '', summary: '', body: '', role: '', features: [], shotAlts: [] }
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

function Shots({ value = [], onChange }) {
  const { busy, upload } = useMedia()
  return (
    <div className="ap-image-list">
      <span className="ap-field-label">Zrzuty ekranu <b className="ap-count">{value.length}</b></span>
      <div className="ap-pe-shots">
        {value.map((shot, index) => (
          <figure key={`${shot.src}-${index}`}>
            <img src={shot.src} alt="" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, position) => position !== index))}
              aria-label="Usuń"
            >
              <Trash2 size={12} />
            </button>
          </figure>
        ))}
        <Dropzone
          compact
          busy={busy}
          onFiles={async files => {
            const uploaded = await upload(files)
            onChange([...value, ...uploaded.map(file => ({ src: file.url, alt: '' }))])
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

function Editor({ project, platforms, section, onSection, onChange, onSave, onDelete, saving, dirty }) {
  const [release, setRelease] = useState(project.release || null)
  const [checking, setChecking] = useState(false)
  const update = patch => onChange({ ...project, ...patch })
  const [lang, setLang] = useState('pl')
  const en = { ...emptyTranslation(), ...(project.en || {}) }
  // Pola tekstowe edytują wersję wybraną w zakładce języka; w angielskiej
  // podpowiedzią jest polski oryginał, a puste pole spada na niego na stronie.
  const value = key => (lang === 'en' ? en[key] : project[key])
  const set = (key, next) => (lang === 'en' ? update({ en: { ...en, [key]: next } }) : update({ [key]: next }))
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
          <span className="mono">/portfolio/{project.slug || '…'}</span>
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
            <Shots value={project.shots} onChange={shots => update({ shots })} />
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
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onReset={() => onChange(null)} resetLabel="Odrzuć zmiany" />
    </div>
  )
}

export default function ProjectsManager({ notify, item = '', onItem = () => {} }) {
  const [projects, setProjects] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState('basics')
  const [query, setQuery] = useState('')

  const load = async (keep = '') => {
    try {
      const payload = await api('/api/admin/projects')
      setProjects(payload.projects)
      setPlatforms(payload.platforms)
      const next = keep || selected
      const current = payload.projects.find(entry => entry.id === next)
        || (!next && item ? payload.projects.find(entry => entry.slug === item) : null)
      setSelected(current ? current.id : '')
      setDraft(current ? structuredClone(current) : null)
      if (current) onItem(current.slug)
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  useEffect(() => { load() }, [])

  const original = useMemo(
    () => (projects || []).find(item => item.id === selected) || null,
    [projects, selected],
  )

  const dirty = Boolean(draft && original) && JSON.stringify(draft) !== JSON.stringify(original)

  const choose = project => {
    setSelected(project.id)
    setDraft(structuredClone(project))
    onItem(project.slug)
  }

  // „Wstecz” w przeglądarce zmienia adres – lista idzie za nim.
  useEffect(() => {
    if (!projects || !item) return
    const target = projects.find(entry => entry.slug === item)
    if (target && target.id !== selected) choose(target)
  }, [item, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    try {
      const created = await api('/api/admin/projects', json('POST', emptyProject()))
      setQuery('')
      setSection('basics')
      await load(created.id)
      notify('Praca dodana. Uzupełnij treść i opublikuj.')
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await api(`/api/admin/projects/${draft.id}`, json('PUT', draft))
      await load(saved.id)
      notify('Praca zapisana.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Usunąć „${draft.name}” z portfolio?`)) return
    try {
      await api(`/api/admin/projects/${draft.id}`, { method: 'DELETE' })
      setSelected('')
      setDraft(null)
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
    const ids = projects.map(item => item.id)
    const index = ids.indexOf(id)
    const clamped = Math.max(0, Math.min(target, ids.length - 1))
    if (index === -1 || clamped === index) return
    ids.splice(clamped, 0, ids.splice(index, 1)[0])
    const byId = new Map(projects.map(item => [item.id, item]))
    setProjects(ids.map(item => byId.get(item)))
    try {
      setProjects(await api('/api/admin/projects/reorder', json('POST', { ids })))
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }
  const move = (id, direction) => moveTo(id, projects.findIndex(item => item.id === id) + direction)

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

  return (
    <div className="ap-projects">
      <GithubBar notify={notify} onRefreshed={() => (dirty ? undefined : load())} />

      <div className="ap-projects-layout">
        <aside className="ap-plist">
          <div className="ap-plist-head">
            <label className="ap-plist-search">
              <Search size={14} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Szukaj w ${projects.length} pracach`} />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Wyczyść"><X size={13} /></button>}
            </label>
            <button type="button" className="ap-btn ap-btn-primary ap-btn-sm" onClick={create} title="Dodaj pracę">
              <Plus size={14} /> Dodaj
            </button>
          </div>

          <div className="ap-plist-scroll">
            {!projects.length && <Empty>Portfolio jest puste. Dodaj pierwszą pracę.</Empty>}
            {projects.length > 0 && !visible.length && <p className="ap-plist-none">Nic nie pasuje do „{query}”.</p>}

            {visible.map(project => {
              const index = projects.indexOf(project)
              return (
                <div
                  key={project.id}
                  className={`ap-prow ${project.id === selected ? 'is-active' : ''} ${dragging === project.id ? 'is-dragging' : ''} ${dropAt === index && dragging && dragging !== project.id ? 'is-drop' : ''}`}
                  draggable={sortable}
                  onDragStart={event => { setDragging(project.id); event.dataTransfer.effectAllowed = 'move' }}
                  onDragOver={event => { if (!dragging) return; event.preventDefault(); setDropAt(index) }}
                  onDrop={event => { event.preventDefault(); if (dragging) moveTo(dragging, index); setDragging(null); setDropAt(-1) }}
                  onDragEnd={() => { setDragging(null); setDropAt(-1) }}
                >
                  {sortable && <GripVertical className="ap-prow-grip" size={14} aria-hidden="true" />}
                  <button type="button" className="ap-prow-pick" onClick={() => choose(project)}>
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
                      {project.release?.error && <CircleAlert className="is-error" size={13} aria-label="Problem z wydaniem" />}
                      {project.featured && <Star className="is-gold" size={13} aria-label="Na stronie głównej" />}
                      {project.published === false && <EyeOff size={13} aria-label="Nieopublikowana" />}
                    </span>
                  </button>
                  {sortable && (
                    <div className="ap-prow-order">
                      <button type="button" onClick={() => moveTo(project.id, 0)} disabled={index === 0} aria-label="Na samą górę" title="Na samą górę"><ChevronsUp size={13} /></button>
                      <button type="button" onClick={() => move(project.id, -1)} disabled={index === 0} aria-label="Wyżej" title="Wyżej"><ChevronUp size={13} /></button>
                      <button type="button" onClick={() => move(project.id, 1)} disabled={index === projects.length - 1} aria-label="Niżej" title="Niżej"><ChevronDown size={13} /></button>
                      <button type="button" onClick={() => moveTo(project.id, projects.length - 1)} disabled={index === projects.length - 1} aria-label="Na sam dół" title="Na sam dół"><ChevronsDown size={13} /></button>
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
                project={draft}
                platforms={platforms}
                section={section}
                onSection={setSection}
                onChange={next => setDraft(next === null ? structuredClone(original) : next)}
                onSave={save}
                onDelete={remove}
                saving={saving}
                dirty={dirty}
              />
            )
            : <Empty>Wybierz pracę z listy albo dodaj nową.</Empty>}
        </div>
      </div>
    </div>
  )
}
