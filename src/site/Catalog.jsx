import { useMemo, useState } from 'react'
import { Globe, Search, X } from 'lucide-react'
import { useT } from '../lib/i18n'
import { PLATFORM_LABEL } from '../lib/projects'
import PlatformIcon from '../lib/PlatformIcon'
import Heading from './Heading'
import Register, { platformsOf } from './Register'

/**
 * Całe portfolio pod `/portfolio`, na pełną szerokość okna. Nagłówek dzieli
 * się na tytuł i wprowadzenie, pod nim pasek filtrów: rodzaj pracy (serwis
 * otwiera się w przeglądarce, aplikację się pobiera), platforma i wyszukiwarka.
 * Liczby przy filtrach mówią, ile pozycji za nimi stoi.
 */

const PLATFORM_ORDER = ['android', 'windows', 'ios', 'macos', 'linux', 'web']

const normalize = value => String(value || '').toLocaleLowerCase('pl').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

export default function Catalog({ data, projects, onNavigate }) {
  const { t } = useT()
  const [kind, setKind] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [query, setQuery] = useState('')

  const indexed = useMemo(() => projects.map(project => ({
    project,
    platforms: platformsOf(project),
    text: normalize([project.name, project.label, project.tagline, project.slug].join(' ')),
  })), [projects])

  const byKind = useMemo(() => ({
    all: indexed,
    web: indexed.filter(item => item.project.kind === 'web'),
    app: indexed.filter(item => item.project.kind === 'app'),
  }), [indexed])

  const kinds = [
    ['all', data.filterAll],
    ['web', data.filterWeb],
    ['app', data.filterApp],
  ].filter(([id]) => byKind[id].length > 0)

  const inKind = byKind[kind] || indexed
  const platforms = PLATFORM_ORDER
    .map(id => [id, inKind.filter(item => item.platforms.includes(id)).length])
    .filter(([, count]) => count > 0)

  const needle = normalize(query.trim())
  const shown = inKind
    .filter(item => platform === 'all' || item.platforms.includes(platform))
    .filter(item => !needle || needle.split(/\s+/).every(word => item.text.includes(word)))
    .map(item => item.project)

  const filtered = kind !== 'all' || platform !== 'all' || needle
  const reset = () => { setKind('all'); setPlatform('all'); setQuery('') }
  const platformName = id => (id === 'web' ? t('platform.web') : PLATFORM_LABEL[id] || id)

  return (
    <main className="catalog">
      <section className="pf">
        <header className="pf-head">
          <h1 className="pf-heading"><Heading title={data.title} accent={data.accent} /></h1>
          <div className="pf-intro">
            {data.lead && <p>{data.lead}</p>}
            <span className="pf-count">{t('catalog.count', projects.length)}</span>
          </div>
        </header>

        {projects.length > 0 && (
          <div className="pf-toolbar">
            {kinds.length > 2 && (
              <div className="pf-seg" role="group" aria-label={t('catalog.filters')}>
                {kinds.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={kind === id ? 'is-active' : ''}
                    onClick={() => { setKind(id); setPlatform('all') }}
                    aria-pressed={kind === id}
                  >
                    {label} <i>{byKind[id].length}</i>
                  </button>
                ))}
              </div>
            )}

            {platforms.length > 1 && (
              <div className="pf-platforms" role="group" aria-label={t('catalog.platforms')}>
                {platforms.map(([id, count]) => (
                  <button
                    key={id}
                    type="button"
                    className={platform === id ? 'is-active' : ''}
                    onClick={() => setPlatform(platform === id ? 'all' : id)}
                    aria-pressed={platform === id}
                    title={platformName(id)}
                  >
                    {id === 'web' ? <Globe size={14} aria-hidden="true" /> : <PlatformIcon platform={id} size={14} aria-hidden="true" />}
                    <span>{platformName(id)}</span>
                    <i>{count}</i>
                  </button>
                ))}
              </div>
            )}

            <label className="pf-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('catalog.searchPlaceholder')}
                aria-label={t('catalog.search')}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label={t('catalog.clear')}>
                  <X size={14} />
                </button>
              )}
            </label>

            {filtered && (
              <span className="pf-shown" aria-live="polite">{t('catalog.shown', shown.length, projects.length)}</span>
            )}
          </div>
        )}

        {filtered && shown.length === 0 ? (
          <div className="pf-nomatch">
            <p>{t('catalog.noMatch')}</p>
            <button type="button" className="btn btn-ghost" onClick={reset}>{t('catalog.clear')}</button>
          </div>
        ) : (
          <Register projects={shown} onNavigate={onNavigate} empty={t('catalog.empty')} />
        )}
      </section>
    </main>
  )
}
