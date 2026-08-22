import { Reveal } from '../lib/ui'
import TextBreak from './TextBreak'

export default function SectionHead({ title, accent, lead, align = 'split', accentOnNewLine = false, accentBreakBefore }) {
  return (
    <Reveal className={`section-head is-${align}`}>
      <div className="section-head-main">
        <h2>
          {title}{' '}
          {accent && (
            <em className={`accent${accentOnNewLine ? ' is-new-line' : ''}`}>
              <TextBreak text={accent} before={accentBreakBefore} />
            </em>
          )}
        </h2>
        {lead && (
          <div className="section-head-lead">
            <i aria-hidden="true" />
            <p>{lead}</p>
          </div>
        )}
      </div>
    </Reveal>
  )
}
