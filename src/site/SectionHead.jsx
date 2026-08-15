import { Reveal } from '../lib/ui'

export default function SectionHead({ title, accent, lead, align = 'split' }) {
  return (
    <Reveal className={`section-head is-${align}`}>
      <div className="section-head-main">
        <h2>{title} {accent && <em className="accent">{accent}</em>}</h2>
        {lead && <p>{lead}</p>}
      </div>
    </Reveal>
  )
}
