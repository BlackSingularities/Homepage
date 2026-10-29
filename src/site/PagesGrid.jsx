import { ArrowUpRight } from 'lucide-react'
import SectionHead from './SectionHead'
import { useT } from '../lib/i18n'
import GlowEdge from '../lib/GlowEdge'

/**
 * Podstrony z panelu jako wejścia: każda pozycja jest obwiedzionym polem
 * z jawnym „Zobacz szczegóły” i strzałką, więc od razu widać, że prowadzi dalej.
 */
export default function PagesGrid({ data, pages, onNavigate }) {
  const { t, lp } = useT()
  if (!pages.length) return null
  return (
    <section className="section rail" id="oferta">
      <SectionHead title={data.title} accent={data.accent} lead={data.lead} />
      <ul className="pages-list">
        {pages.map(page => (
          <li key={page.id}>
            <GlowEdge
              as="a"
              href={lp(`/p/${page.slug}`)}
              onClick={event => { event.preventDefault(); onNavigate(lp(`/p/${page.slug}`)) }}
            >
              <span className="pages-text">
                <strong>{page.title}</strong>
                {page.excerpt && <span>{page.excerpt}</span>}
                <em>{t('pages.details')}</em>
              </span>
              <i className="pages-go" aria-hidden="true"><ArrowUpRight size={20} /></i>
            </GlowEdge>
          </li>
        ))}
      </ul>
    </section>
  )
}
