import { ArrowUpRight } from 'lucide-react'
import { Reveal, useSpotlight } from '../lib/ui'
import SectionHead from './SectionHead'

function PageCard({ page, index, onNavigate }) {
  const spotlight = useSpotlight()
  return (
    <Reveal className="page-card-wrap" delay={index * 0.06} amount={0.2}>
      <a
        className={`page-card spotlight accent-${page.accent || 'gold'}`}
        ref={spotlight}
        href={`/p/${page.slug}`}
        onClick={event => { event.preventDefault(); onNavigate(`/p/${page.slug}`) }}
      >
        {page.cover
          ? <span className="page-card-media"><img src={page.cover} alt="" loading="lazy" /></span>
          : <span className="page-card-media is-empty" aria-hidden="true"><i>{page.title.slice(0, 2)}</i></span>}
        <span className="page-card-body">
          {page.kicker && <b className="page-card-kicker">{page.kicker}</b>}
          <strong>{page.title}</strong>
          {page.excerpt && <span>{page.excerpt}</span>}
          <i className="page-card-more">Czytaj więcej <ArrowUpRight size={15} /></i>
        </span>
      </a>
    </Reveal>
  )
}

export default function PagesGrid({ data, pages, onNavigate }) {
  if (!pages.length) return null
  return (
    <section className="section pages-section" id="oferta">
      <SectionHead kicker={data.kicker} title={data.title} accent={data.accent} lead={data.lead} index="006" />
      <div className="pages-grid">
        {pages.map((page, index) => (
          <PageCard key={page.id} page={page} index={index} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}
