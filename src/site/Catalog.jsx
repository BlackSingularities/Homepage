import { useEffect, useMemo, useState } from 'react'
import { plural } from '../lib/projects'
import Register from './Register'
import SectionHead from './SectionHead'

/**
 * Pełny rejestr pod `/realizacje`. Filtr dzieli treść na dwa rodzaje, które
 * naprawdę różnią się dowodem: serwis otwiera się w przeglądarce, aplikację
 * się pobiera. Liczba przy filtrze mówi, ile pozycji za nim stoi.
 */
export default function Catalog({ data, projects, onNavigate }) {
  const [kind, setKind] = useState('all')

  useEffect(() => {
    document.title = `${data.title} ${data.accent} — Adam Rędzikowski`.replace(/\s+/g, ' ').trim()
  }, [data.title, data.accent])

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
          count={`${projects.length} ${plural(projects.length, 'pozycja', 'pozycje', 'pozycji')} w rejestrze`}
          action={filters.length > 2 ? (
            <div className="catalog-filters" role="group" aria-label="Rodzaj realizacji">
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
        <Register projects={shown} onNavigate={onNavigate} empty="Nic tu jeszcze nie ma." />
      </section>
    </main>
  )
}
