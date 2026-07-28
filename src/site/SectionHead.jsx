import { Reveal } from '../lib/ui'

export default function SectionHead({ kicker, title, accent, lead, index, align = 'split' }) {
  return (
    <Reveal className={`section-head is-${align}`}>
      <div className="section-kicker">
        <span>{kicker}</span>
        {index && <span className="section-index">{index}</span>}
      </div>
      <div className="section-head-main">
        <h2>{title} {accent && <em className="accent">{accent}</em>}</h2>
        {lead && <p>{lead}</p>}
      </div>
    </Reveal>
  )
}
