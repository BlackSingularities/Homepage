import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole, Mail, Phone, Send } from 'lucide-react'
import { ease } from '../lib/ui'

const BUDGETS = ['do 10 000 zł', '10 000 – 25 000 zł', '25 000 – 60 000 zł', 'powyżej 60 000 zł', 'do ustalenia']
const TIMELINES = ['jak najszybciej', '1 – 3 miesiące', 'ponad 3 miesiące', 'zbieram informacje']

const EMPTY = {
  name: '', company: '', email: '', phone: '', contactMethod: 'email',
  subject: '', message: '', budget: '', timeline: '', scope: [],
  consent: false, website: '', source: 'formularz',
}

const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export default function ContactForm({ scopeOptions = [] }) {
  const [form, setForm] = useState(EMPTY)
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState(false)
  const [state, setState] = useState({ status: 'idle', message: '' })

  const update = event => {
    const { name, value, type, checked } = event.target
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleScope = label => setForm(current => ({
    ...current,
    scope: current.scope.includes(label) ? current.scope.filter(item => item !== label) : [...current.scope, label],
  }))

  const stepOneValid = form.message.trim().length >= 12
  const stepTwoValid = form.name.trim().length >= 2
    && isEmail(form.email)
    && (form.contactMethod !== 'phone' || form.phone.trim().length >= 6)
    && form.consent

  const next = () => {
    setTouched(true)
    if (!stepOneValid) return
    setTouched(false)
    setStep(1)
  }

  const submit = async event => {
    event.preventDefault()
    setTouched(true)
    if (!stepTwoValid) return
    setState({ status: 'loading', message: '' })
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się wysłać wiadomości.')
      setState({ status: 'success', message: 'Wiadomość dotarła. Wrócę do Ciebie możliwie szybko.' })
      setForm(EMPTY)
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  if (state.status === 'success') {
    return (
      <motion.div className="contact-success" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <span className="contact-success-mark"><Check size={26} /></span>
        <h3>Dziękuję.<br /><em className="accent">Teraz moja kolej.</em></h3>
        <p>{state.message}</p>
        <button className="btn btn-ghost" onClick={() => { setState({ status: 'idle', message: '' }); setStep(0) }}>
          Wyślij kolejną wiadomość
        </button>
      </motion.div>
    )
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <aside className="form-steps">
        <div className="form-steps-intro">
          <h3>Kilka konkretów wystarczy.</h3>
          <p>Nie potrzebujesz gotowej specyfikacji. Opisz cel albo problem – resztę uporządkujemy wspólnie.</p>
        </div>

        <div className="form-step-list">
          {['Projekt', 'Kontakt'].map((label, index) => (
            <button
              key={label}
              type="button"
              className={`form-step ${step === index ? 'is-active' : ''} ${step > index ? 'is-done' : ''}`}
              onClick={() => index === 0 && setStep(0)}
            >
              <i>{step > index ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</i>
              <span>{label}<small>{index === 0 ? 'Cel, zakres i termin' : 'Dane do odpowiedzi'}</small></span>
            </button>
          ))}
        </div>

        <div className="form-progress"><i style={{ width: step === 0 ? '50%' : '100%' }} /></div>
        <p className="form-privacy"><LockKeyhole size={13} /> Dane służą wyłącznie do odpowiedzi na zapytanie.</p>
      </aside>

      <div className="form-content">
        <header className="form-stage-head">
          <span>Krok {step + 1} z 2</span>
          <h3>{step === 0 ? 'Opowiedz o projekcie.' : 'Jak mogę się z Tobą skontaktować?'}</h3>
          <p>{step === 0
            ? 'Wybierz to, co już wiesz. Budżet i termin możesz zostawić do wspólnego ustalenia.'
            : 'Potrzebuję tylko danych niezbędnych do udzielenia odpowiedzi.'}</p>
        </header>

        {step === 0 ? (
          <motion.div className="form-stage" key="stage-project" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }}>
            <label className="field">
              <span>Temat projektu</span>
              <input name="subject" value={form.subject} onChange={update} placeholder="Np. panel dla klientów albo autorski blog" />
            </label>

            {scopeOptions.length > 0 && (
              <div className="field form-section">
                <span>Czego potrzebujesz?</span>
                <div className="chips scope-choices">
                  {scopeOptions.map(option => (
                    <button type="button" key={option} className={`chip ${form.scope.includes(option) ? 'is-active' : ''}`} onClick={() => toggleScope(option)} aria-pressed={form.scope.includes(option)}>
                      <i>{form.scope.includes(option) ? <Check size={12} /> : '+'}</i><span>{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field-row form-choice-row">
              <div className="field form-section">
                <span>Orientacyjny budżet</span>
                <div className="chips compact-choices">
                  {BUDGETS.map(option => (
                    <button type="button" key={option} className={`chip ${form.budget === option ? 'is-active' : ''}`} onClick={() => setForm(current => ({ ...current, budget: current.budget === option ? '' : option }))}>{option}</button>
                  ))}
                </div>
              </div>
              <div className="field form-section">
                <span>Termin</span>
                <div className="chips compact-choices">
                  {TIMELINES.map(option => (
                    <button type="button" key={option} className={`chip ${form.timeline === option ? 'is-active' : ''}`} onClick={() => setForm(current => ({ ...current, timeline: current.timeline === option ? '' : option }))}>{option}</button>
                  ))}
                </div>
              </div>
            </div>

            <label className={`field ${touched && !stepOneValid ? 'has-error' : ''}`}>
              <span>Najważniejsza informacja *</span>
              <textarea name="message" value={form.message} onChange={update} rows="6" placeholder="Co dziś nie działa, czego potrzebują użytkownicy i jaki efekt chcesz osiągnąć?" />
              {touched && !stepOneValid && <i className="field-error">Napisz kilka zdań – minimum 12 znaków.</i>}
            </label>

            <div className="form-nav">
              <span className="form-hint">Odpowiedz tylko na tyle, ile wiesz na tym etapie.</span>
              <button type="button" className="btn btn-primary" onClick={next}>Przejdź do kontaktu <ArrowRight size={17} /></button>
            </div>
          </motion.div>
        ) : (
          <motion.div className="form-stage" key="stage-contact" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }}>
            <div className="field-row">
              <label className={`field ${touched && form.name.trim().length < 2 ? 'has-error' : ''}`}>
                <span>Imię i nazwisko *</span>
                <input name="name" value={form.name} onChange={update} autoComplete="name" placeholder="Jak mam się do Ciebie zwracać?" />
              </label>
              <label className="field">
                <span>Firma</span>
                <input name="company" value={form.company} onChange={update} autoComplete="organization" placeholder="Opcjonalnie" />
              </label>
            </div>

            <div className="field-row">
              <label className={`field ${touched && !isEmail(form.email) ? 'has-error' : ''}`}>
                <span>E-mail *</span>
                <input type="email" name="email" value={form.email} onChange={update} autoComplete="email" placeholder="Adres do odpowiedzi" />
              </label>
              <label className={`field ${touched && form.contactMethod === 'phone' && form.phone.trim().length < 6 ? 'has-error' : ''}`}>
                <span>Telefon {form.contactMethod === 'phone' ? '*' : ''}</span>
                <input type="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" placeholder="+48…" />
              </label>
            </div>

            <div className="field form-section">
              <span>Preferowany sposób odpowiedzi</span>
              <div className="method-choice">
                {[['email', 'Mailowo', Mail], ['phone', 'Telefonicznie', Phone]].map(([value, label, Icon]) => (
                  <button type="button" key={value} className={form.contactMethod === value ? 'is-active' : ''} onClick={() => setForm(current => ({ ...current, contactMethod: value }))} aria-pressed={form.contactMethod === value}>
                    <Icon size={15} />{label}
                  </button>
                ))}
              </div>
            </div>

            <label className="honeypot" aria-hidden="true">
              <span>Strona internetowa</span>
              <input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off" />
            </label>

            <label className={`consent ${touched && !form.consent ? 'has-error' : ''}`}>
              <input type="checkbox" name="consent" checked={form.consent} onChange={update} />
              <span>Zgadzam się na kontakt w sprawie przesłanego zapytania.</span>
            </label>

            <div className="form-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={16} /> Wróć do projektu</button>
              <button type="submit" className="btn btn-primary" disabled={state.status === 'loading'}>
                {state.status === 'loading' ? <><LoaderCircle className="spin" size={18} /> Wysyłam</> : <>Wyślij wiadomość <Send size={17} /></>}
              </button>
            </div>

            {touched && !stepTwoValid && <p className="form-error">Uzupełnij zaznaczone pola, żeby wysłać wiadomość.</p>}
            {state.status === 'error' && <p className="form-error" role="alert">{state.message}</p>}
          </motion.div>
        )}
      </div>
    </form>
  )
}
