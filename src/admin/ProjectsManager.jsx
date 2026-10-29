import { useEffect, useMemo, useState } from 'react'
import {
  AppWindow, ArrowUpRight, CircleAlert, Download, Eye, EyeOff, GitBranch, LoaderCircle,
  Package, Plus, RefreshCw, Save, Star, Trash2,
} from 'lucide-react'
import { api, json, uid } from '../lib/api'
import {
  PLATFORM_LABEL, PLATFORM_ORDER, formatBytes, formatReleaseDate,
} from '../lib/projects'
import {
  Area, Dropzone, Empty, Field, ImagePicker, LangTabs, Notice, Repeater, SaveBar, Select, Text, Toggle, useMedia,
} from './parts'

/**
 * Portfolio. Dwa rodzaje treści, więc formularz pokazuje tylko to, co
 * dotyczy wybranego rodzaju: strona ma adres, aplikacja – repozytorium albo
 * ręczną listę plików. Wydania z GitHuba podglądamy tutaj, żeby błąd tokenu
 * albo brak uprawnień było widać przed publikacją, a nie na stronie.
 */

const KIND_OPTIONS = [
  ['web', 'Strona internetowa'],
  ['app', 'Aplikacja'],
]

const RELEASE_OPTIONS = [
  ['github', 'Najnowsze wydanie z GitHuba'],
  ['manual', 'Ręczna lista plików'],
  ['none', 'Bez plików do pobrania'],
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
      <span className="ap-field-label">Zrzuty ekranu</span>
      <Dropzone
        compact
        busy={busy}
        onFiles={async files => {
          const uploaded = await upload(files)
          onChange([...value, ...uploaded.map(file => ({ src: file.url, alt: '' }))])
        }}
      />
      <div className="ap-image-strip">
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
        {!value.length && <span className="ap-hint">Brak zrzutów ekranu.</span>}
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
        <button type="button" className="ap-btn ap-btn-ghost" onClick={onRefresh} disabled={busy}>
          <RefreshCw size={13} /> Odśwież
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
function GithubPanel({ notify }) {
  const [state, setState] = useState(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () => api('/api/admin/github').then(setState).catch(requestError => setError(requestError.message))

  useEffect(() => { load() }, [])

  const save = async (clear = false) => {
    setBusy(true)
    setError('')
    try {
      setState(await api('/api/admin/github', json('PUT', clear ? { clear: true } : { token })))
      setToken('')
      notify(clear ? 'Token GitHuba został usunięty.' : 'Token GitHuba zapisany.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ap-github">
      <div className="ap-github-head">
        <GitBranch size={16} />
        <div>
          <strong>Połączenie z GitHubem</strong>
          <p>
            {state?.configured && state?.ok && `Token działa – konto ${state.login}. Prywatne repozytoria są czytane.`}
            {state?.configured && state?.ok === false && (state.error || 'Token nie działa.')}
            {state && !state.configured && 'Bez tokenu czytam tylko repozytoria publiczne i ich publiczne wydania.'}
            {!state && 'Sprawdzam połączenie…'}
          </p>
        </div>
      </div>
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      <div className="ap-github-form">
        <Text
          label="Token dostępu (classic lub fine-grained)"
          type="password"
          value={token}
          onChange={setToken}
          placeholder={state?.configured ? '•••••••• – wpisz nowy, aby podmienić' : 'ghp_…'}
          hint="Wystarczy uprawnienie do odczytu zawartości repozytoriów. Token jest szyfrowany przed zapisem i nigdy nie opuszcza serwera."
          wide
        />
        <div className="ap-github-actions">
          <button className="ap-btn ap-btn-primary" onClick={() => save()} disabled={busy || !token}>
            <Save size={14} /> Zapisz token
          </button>
          {state?.configured && (
            <button className="ap-btn ap-btn-ghost" onClick={() => save(true)} disabled={busy}>
              <Trash2 size={14} /> Usuń token
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Editor({ project, platforms, onChange, onSave, onDelete, saving, dirty }) {
  const [release, setRelease] = useState(project.release || null)
  const [checking, setChecking] = useState(false)
  const [releaseError, setReleaseError] = useState('')
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
    setReleaseError('')
    try {
      setRelease(await api('/api/admin/github/release', json('POST', { repo: project.repo })))
    } catch (requestError) {
      setReleaseError(requestError.message)
    } finally {
      setChecking(false)
    }
  }

  const isApp = project.kind === 'app'

  return (
    <div className="ap-project-editor">
      <div className="ap-grid-3">
        <Text label="Nazwa" value={project.name} onChange={name => update({ name })} />
        <Text
          label="Adres pracy"
          value={project.slug}
          onChange={slug => update({ slug })}
          hint={`/portfolio/${project.slug || '…'}`}
        />
        <Select
          label="Rodzaj"
          value={project.kind}
          onChange={kind => update({ kind, releaseSource: kind === 'app' ? project.releaseSource : 'none' })}
          options={KIND_OPTIONS}
        />
      </div>

      <LangTabs
        value={lang}
        onChange={setLang}
        hint={lang === 'en'
          ? 'Wersja angielska (/en/portfolio/…). Puste pole = na stronie pokaże się polski tekst.'
          : 'Wersja polska – podstawowa.'}
      />

      <div className="ap-grid-2">
        <Text label="Etykieta" value={value('label')} onChange={next => set('label', next)} placeholder={original('label') || 'OSINT / analiza danych'} />
        <Text label="Rok" value={project.year} onChange={year => update({ year })} />
      </div>

      <Text label="Zdanie na liście" value={value('tagline')} onChange={next => set('tagline', next)} wide
        placeholder={original('tagline')} hint="Jedno zdanie, które widać na liście." />
      <Area label="Wprowadzenie" value={value('summary')} onChange={next => set('summary', next)} rows={2}
        placeholder={original('summary')} hint="Pierwszy, wyróżniony akapit na stronie pracy." />
      <Area label="Opis" value={value('body')} onChange={next => set('body', next)} rows={7}
        placeholder={original('body')} hint="Akapity rozdzielaj pustą linią." />
      <Text label="Mój udział" value={value('role')} onChange={next => set('role', next)} wide
        placeholder={original('role') || 'Analiza, projekt, wykonanie, wdrożenie i utrzymanie'} />

      <div className="ap-grid-2">
        <Lines key={`features-${lang}`} label="Funkcje" value={value('features')} onChange={next => set('features', next)} rows={5} />
        <Lines label="Technologie" value={project.stack} onChange={stack => update({ stack })} rows={5}
          hint="Wspólne dla obu języków. Każda linia to osobna pozycja." />
      </div>

      <ImagePicker label="Ikona aplikacji" value={project.icon} onChange={icon => update({ icon })}
        hint="Kwadratowa ikona z przezroczystym tłem – pokazuje się obok nazwy, osobno od zrzutów." />
      <ImagePicker label="Okładka na liście" value={project.cover} onChange={cover => update({ cover })}
        hint="Najlepiej poziomy zrzut ekranu – kadrowany do 16:10." />
      <Shots value={project.shots} onChange={shots => update({ shots })} />

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

      {isApp && (
        <div className="ap-project-app">
          <Select
            label="Skąd pliki do pobrania"
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
              {releaseError && <Notice tone="error" onClose={() => setReleaseError('')}>{releaseError}</Notice>}
              <ReleasePreview release={release} busy={checking} onRefresh={checkRelease} />
              {!release && !checking && (
                <button className="ap-btn ap-btn-ghost" onClick={checkRelease} disabled={!project.repo}>
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
                  <Text label="Adres pliku" value={item.url} onChange={url => patch({ url })} wide placeholder="https://…" />
                  <Text label="Opis pliku" value={item.label} onChange={label => patch({ label })} wide placeholder=".exe · instalator" />
                </>
              )}
            />
          )}
        </div>
      )}

      <div className="ap-grid-2">
        <Toggle
          label="Opublikowana"
          hint="Dopóki wyłączone, praca jest widoczna tylko tutaj."
          checked={project.published !== false}
          onChange={published => update({ published })}
        />
        <Toggle
          label="Wybrana na stronę główną"
          hint="Strona główna pokazuje do pięciu wybranych prac."
          checked={project.featured === true}
          onChange={featured => update({ featured })}
        />
      </div>

      <div className="ap-project-foot">
        <button className="ap-btn ap-btn-danger" onClick={onDelete}>
          <Trash2 size={14} /> Usuń pracę
        </button>
        {project.slug && project.published !== false && (
          <>
            <a className="ap-btn ap-btn-ghost" href={`/portfolio/${project.slug}`} target="_blank" rel="noreferrer">
              Podejrzyj PL <ArrowUpRight size={14} />
            </a>
            <a className="ap-btn ap-btn-ghost" href={`/en/portfolio/${project.slug}`} target="_blank" rel="noreferrer">
              Podejrzyj EN <ArrowUpRight size={14} />
            </a>
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
  const [error, setError] = useState('')

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
      setError(requestError.message)
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
      await load(created.id)
      notify('Praca dodana. Uzupełnij treść i opublikuj.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await api(`/api/admin/projects/${draft.id}`, json('PUT', draft))
      await load(saved.id)
      notify('Praca zapisana.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Usunąć „${draft.name}” z portfolio?`)) return
    await api(`/api/admin/projects/${draft.id}`, { method: 'DELETE' })
    setSelected('')
    setDraft(null)
    onItem('')
    await load()
    notify('Praca usunięta.')
  }

  const move = async (id, direction) => {
    const ids = projects.map(item => item.id)
    const index = ids.indexOf(id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ids.splice(target, 0, ids.splice(index, 1)[0])
    setProjects(await api('/api/admin/projects/reorder', json('POST', { ids })))
  }

  if (!projects) {
    return <div className="ap-inline-loading"><LoaderCircle className="spin" size={18} /> Wczytuję portfolio…</div>
  }

  return (
    <div className="ap-projects">
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <GithubPanel notify={notify} />

      <div className="ap-projects-layout">
        <div className="ap-projects-list">
          <div className="ap-projects-list-head">
            <span>{projects.length} w portfolio</span>
            <button className="ap-btn ap-btn-primary" onClick={create}><Plus size={14} /> Dodaj</button>
          </div>

          {!projects.length && <Empty>Portfolio jest puste. Dodaj pierwszą pracę.</Empty>}

          {projects.map((project, index) => (
            <div key={project.id} className={`ap-project-row ${project.id === selected ? 'is-active' : ''}`}>
              <button type="button" className="ap-project-pick" onClick={() => choose(project)}>
                <span className="ap-project-thumb">
                  {project.icon || project.cover ? <img src={project.icon || project.cover} alt="" /> : <AppWindow size={15} />}
                </span>
                <span className="ap-project-text">
                  <strong>{project.name || 'Bez nazwy'}</strong>
                  <small>
                    {project.kind === 'app' ? 'Aplikacja' : 'Strona'}
                    {project.label ? ` · ${project.label}` : ''}
                  </small>
                </span>
                <span className="ap-project-flags">
                  {project.featured && <Star size={13} aria-label="Na stronie głównej" />}
                  {project.published === false
                    ? <EyeOff size={13} aria-label="Nieopublikowana" />
                    : <Eye size={13} aria-label="Opublikowana" />}
                  {project.release?.error && <CircleAlert size={13} aria-label="Problem z wydaniem" />}
                </span>
              </button>
              <div className="ap-project-order">
                <button type="button" onClick={() => move(project.id, -1)} disabled={index === 0} aria-label="Wyżej">↑</button>
                <button type="button" onClick={() => move(project.id, 1)} disabled={index === projects.length - 1} aria-label="Niżej">↓</button>
              </div>
            </div>
          ))}
        </div>

        <div className="ap-projects-form">
          {draft
            ? (
              <Editor
                project={draft}
                platforms={platforms}
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
