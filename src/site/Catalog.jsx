import { useMemo, useState } from 'react'
import { useT } from '../lib/i18n'
import Register from './Register'
import SectionHead from './SectionHead'

/**
 * Całe portfolio pod `/portfolio`. Filtr dzieli treść na dwa rodzaje, które
 * naprawdę różnią się dowodem: serwis otwiera się w przeglądarce, aplikację
 * się pobiera. Liczba przy filtrze mówi, ile pozycji za nim stoi.
 */
export default function Catalog({ data, projects, onNavigate }) {
  const { t } = useT()
  const [kind, setKind] = useState('all')

  const groups = useMemo(() => ({
    all: projects,
    web: projects.filter(project => project.kind === 'web'),
    app: projects.filter(project => project.kind === 'app'),
  }), [projects])

  const filters = [
    ['all', data.filterAll],
    ['web', data.filterWeb],
    ['app', data.filterApp],
  ].filter(([id]) => groups[id].length > 0)

  const shown = groups[kind] || projects

  return (
    <main className="catalog">
      <section className="section">
        <SectionHead
          title={data.title}
          accent={data.accent}
          lead={data.lead}
          count={t('catalog.count', projects.length)}
          action={filters.length > 2 ? (
            <div className="catalog-filters" role="group" aria-label={t('catalog.filters')}>
              {filters.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${kind === id ? 'is-active' : ''}`}
                  onClick={() => setKind(id)}
                  aria-pressed={kind === id}
                >
                  {label} <i>{groups[id].length}</i>
                </button>
              ))}
            </div>
          ) : null}
        />
        <Register projects={shown} onNavigate={onNavigate} empty={t('catalog.empty')} />
      </section>
    </main>
  )
}
