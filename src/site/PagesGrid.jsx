import { ArrowUpRight } from 'lucide-react'
import SectionHead from './SectionHead'

/**
 * Podstrony z panelu jako wejścia: każda pozycja jest obwiedzionym polem
 * z jawnym „Zobacz szczegóły” i strzałką, więc od razu widać, że prowadzi dalej.
 */
export default function PagesGrid({ data, pages, onNavigate }) {
  if (!pages.length) return null
  return (
    <section className="section rail" id="oferta">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <ul className="pages-list">
        {pages.map(page => (
          <li key={page.id}>
            <a
              href={`/p/${page.slug}`}
              onClick={event => { event.preventDefault(); onNavigate(`/p/${page.slug}`) }}
            >
              <span className="pages-text">
                <strong>{page.title}</strong>
                {page.excerpt && <span>{page.excerpt}</span>}
                <em>Zobacz szczegóły</em>
              </span>
              <i className="pages-go" aria-hidden="true"><ArrowUpRight size={20} /></i>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
