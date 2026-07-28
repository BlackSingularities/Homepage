import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react'
import { Reveal, ease, scrollToId } from '../lib/ui'
import { formatMoney } from '../lib/api'
import SectionHead from './SectionHead'

function useAnimatedNumber(value, duration = 650) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const origin = from.current
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(origin + (value - origin) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    })
    // Frames are paused in hidden tabs — make sure the final figure still lands.
    const safety = setTimeout(() => {
      setDisplay(value)
      from.current = value
    }, duration + 250)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(safety)
    }
  }, [value, duration])
  return display
}

export default function Estimator({ data, onRequest }) {
  const [type, setType] = useState(data.types[0]?.id)
  const [modules, setModules] = useState([])
  const [timeline, setTimeline] = useState(data.timelines[0]?.id)

  const selectedType = data.types.find(item => item.id === type) || data.types[0]
  const selectedTimeline = data.timelines.find(item => item.id === timeline) || data.timelines[0]
  const selectedModules = useMemo(
    () => data.modules.filter(module => modules.includes(module.id)),
    [data.modules, modules],
  )

  const multiplier = Number(selectedTimeline?.multiplier) || 1
  const from = Math.round(((selectedType?.from || 0) + selectedModules.reduce((sum, m) => sum + Number(m.from || 0), 0)) * multiplier)
  const to = Math.round(((selectedType?.to || 0) + selectedModules.reduce((sum, m) => sum + Number(m.to || 0), 0)) * multiplier)
  const animatedFrom = useAnimatedNumber(from)
  const animatedTo = useAnimatedNumber(to)

  const toggle = id => setModules(current => (
    current.includes(id) ? current.filter(item => item !== id) : [...current, id]
  ))

  const reset = () => {
    setType(data.types[0]?.id)
    setModules([])
    setTimeline(data.timelines[0]?.id)
  }

  const send = () => {
    const scope = selectedModules.map(module => module.label)
    onRequest?.({
      subject: selectedType?.label || 'Nowy projekt',
      budget: `${formatMoney(from)} – ${formatMoney(to)}`,
      timeline: selectedTimeline?.label || '',
      scope,
      message: [
        `Interesuje mnie: ${selectedType?.label}.`,
        scope.length ? `Potrzebny zakres: ${scope.join(', ')}.` : 'Zakres do ustalenia.',
        `Tryb realizacji: ${selectedTimeline?.label}.`,
        `Orientacyjne widełki z konfiguratora: ${formatMoney(from)} – ${formatMoney(to)}.`,
        '',
        'Dodatkowy kontekst: ',
      ].join('\n'),
    })
    scrollToId('kontakt')
  }

  return (
    <section className="section estimator" id="wycena">
      <SectionHead kicker={data.kicker} title={data.title} accent={data.accent} lead={data.lead} index="006" />

      <Reveal className="est-shell" amount={0.15}>
        <div className="est-choices">
          <div className="est-block">
            <span className="est-step">01 — Rodzaj projektu</span>
            <div className="est-types">
              {data.types.map(item => (
                <button
                  key={item.id}
                  className={`est-type ${item.id === type ? 'is-active' : ''}`}
                  onClick={() => setType(item.id)}
                  aria-pressed={item.id === type}
                >
                  <b>{item.label}</b>
                  <span>{item.desc}</span>
                  <i className="est-check"><Check size={13} /></i>
                </button>
              ))}
            </div>
          </div>

          <div className="est-block">
            <span className="est-step">02 — Moduły i dodatki</span>
            <div className="est-modules">
              {data.modules.map(module => (
                <button
                  key={module.id}
                  className={`chip ${modules.includes(module.id) ? 'is-active' : ''}`}
                  onClick={() => toggle(module.id)}
                  aria-pressed={modules.includes(module.id)}
                >
                  <i>{modules.includes(module.id) ? <Check size={12} /> : '+'}</i>
                  {module.label}
                </button>
              ))}
            </div>
          </div>

          <div className="est-block">
            <span className="est-step">03 — Tryb realizacji</span>
            <div className="est-timelines">
              {data.timelines.map(item => (
                <button
                  key={item.id}
                  className={`est-time ${item.id === timeline ? 'is-active' : ''}`}
                  onClick={() => setTimeline(item.id)}
                  aria-pressed={item.id === timeline}
                >
                  <b>{item.label}</b>
                  <span>{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="est-summary">
          <div className="est-summary-head">
            <span><Sparkles size={14} /> Orientacyjny koszt</span>
            <button className="est-reset" onClick={reset} type="button"><RotateCcw size={13} /> Wyczyść</button>
          </div>

          <motion.div className="est-price" key={`${from}-${to}`} initial={{ opacity: 0.55 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease }}>
            <b>{formatMoney(animatedFrom)}</b>
            <i>—</i>
            <b>{formatMoney(animatedTo)}</b>
          </motion.div>

          <ul className="est-recap">
            <li><span>Projekt</span><b>{selectedType?.label}</b></li>
            <li><span>Moduły</span><b>{selectedModules.length ? selectedModules.map(m => m.label).join(', ') : 'zakres podstawowy'}</b></li>
            <li><span>Tryb</span><b>{selectedTimeline?.label}</b></li>
          </ul>

          <button className="btn btn-primary est-send" onClick={send} type="button">
            Wyślij ten zakres <ArrowRight size={17} />
          </button>
          <p className="est-note">{data.disclaimer}</p>
        </aside>
      </Reveal>
    </section>
  )
}
