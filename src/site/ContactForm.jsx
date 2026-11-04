import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Boxes, Briefcase, Bug, Check, Handshake, Lightbulb, LoaderCircle, LockKeyhole, Mail, Phone, Send } from 'lucide-react'
import { ease } from '../lib/ui'
import GlowEdge from '../lib/GlowEdge'
import { useT } from '../lib/i18n'

const EMPTY = {
  topic: 'project', app: '', requestType: '',
  name: '', company: '', email: '', phone: '', contactMethod: 'email',
  subject: '', message: '', budget: '', timeline: '', scope: [],
  consent: false, website: '', source: 'formularz',
}

const REQUEST_TYPES = [['bug', Bug], ['feature', Lightbulb], ['collaboration', Handshake]]

const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export default function ContactForm({ scopeOptions = [], apps = [] }) {
  const { t, lang } = useT()
  const BUDGETS = t('form.budgets')
  const TIMELINES = t('form.timelines')
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

  const isApp = form.topic === 'app'
  const messageValid = form.message.trim().length >= 12
  const stepOneValid = messageValid && (!isApp || (form.app && form.requestType))
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
        body: JSON.stringify({ ...form, lang }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || t('form.failed'))
      setState({ status: 'success', message: t('form.sent') })
      setForm(EMPTY)
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  if (state.status === 'success') {
    return (
      <motion.div className="contact-success" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <span className="contact-success-mark"><Check size={26} /></span>
        <h3>{t('form.thanks')}<br /><em className="accent">{t('form.myTurn')}</em></h3>
        <p>{state.message}</p>
        <button className="btn btn-ghost" onClick={() => { setState({ status: 'idle', message: '' }); setStep(0) }}>
          {t('form.again')}
        </button>
      </motion.div>
    )
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <aside className="form-steps">
        <div className="form-steps-intro">
          <h3>{t('form.introTitle')}</h3>
          <p>{t('form.introText')}</p>
        </div>

        <div className="form-step-list">
          {[t(isApp ? 'form.stepApp' : 'form.stepProject'), t('form.stepContact')].map((label, index) => (
            <button
              key={label}
              type="button"
              className={`form-step ${step === index ? 'is-active' : ''} ${step > index ? 'is-done' : ''}`}
              onClick={() => index === 0 && setStep(0)}
            >
              <i>{step > index ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</i>
              <span>{label}<small>{index === 0 ? t(isApp ? 'form.stepAppHint' : 'form.stepProjectHint') : t('form.stepContactHint')}</small></span>
            </button>
          ))}
        </div>

        <div className="form-progress"><i style={{ width: step === 0 ? '50%' : '100%' }} /></div>
        <p className="form-privacy"><LockKeyhole size={13} /> {t('form.privacy')}</p>
      </aside>

      <div className="form-content">
        <header className="form-stage-head">
          <span>{t('form.step', step + 1)}</span>
          <h3>{step === 0 ? t(isApp ? 'form.appTitle' : 'form.projectTitle') : t('form.contactTitle')}</h3>
          <p>{step === 0 ? t(isApp ? 'form.appLead' : 'form.projectLead') : t('form.contactLead')}</p>
        </header>

        {step === 0 ? (
          <motion.div className="form-stage" key="stage-project" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }}>
            {apps.length > 0 && (
              <div className="field form-section">
                <span>{t('form.topic')}</span>
                <div className="method-choice">
                  {[['project', t('form.topicProject'), Briefcase], ['app', t('form.topicApp'), Boxes]].map(([value, label, Icon]) => (
                    <button type="button" key={value} className={form.topic === value ? 'is-active' : ''} onClick={() => setForm(current => ({ ...current, topic: value }))} aria-pressed={form.topic === value}>
                      <Icon size={15} />{label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isApp && (
              <>
                <div className="field form-section">
                  <span>{t('form.app')}</span>
                  <div className="chips scope-choices">
                    {apps.map(app => (
                      <GlowEdge as="button" type="button" key={app.id} className={`chip ${form.app === app.name ? 'is-active' : ''}`} onClick={() => setForm(current => ({ ...current, app: app.name }))} aria-pressed={form.app === app.name}>
                        <i>{form.app === app.name ? <Check size={12} /> : '+'}</i><span>{app.name}</span>
                      </GlowEdge>
                    ))}
                  </div>
                  {touched && !form.app && <i className="field-error">{t('form.appError')}</i>}
                </div>

                <div className="field form-section">
                  <span>{t('form.requestType')}</span>
                  <div className="method-choice">
                    {REQUEST_TYPES.map(([value, Icon]) => (
                      <button type="button" key={value} className={form.requestType === value ? 'is-active' : ''} onClick={() => setForm(current => ({ ...current, requestType: value }))} aria-pressed={form.requestType === value}>
                        <Icon size={15} />{t(`form.type.${value}`)}
                      </button>
                    ))}
                  </div>
                  {touched && !form.requestType && <i className="field-error">{t('form.requestTypeError')}</i>}
                </div>
              </>
            )}

            <label className="field">
              <span>{t(isApp ? 'form.appSubject' : 'form.subject')}</span>
              <input name="subject" value={form.subject} onChange={update} placeholder={t(isApp ? 'form.appSubjectPlaceholder' : 'form.subjectPlaceholder')} />
            </label>

            {!isApp && scopeOptions.length > 0 && (
              <div className="field form-section">
                <span>{t('form.scope')}</span>
                <div className="chips scope-choices">
                  {scopeOptions.map(option => (
                    <GlowEdge as="button" type="button" key={option} className={`chip ${form.scope.includes(option) ? 'is-active' : ''}`} onClick={() => toggleScope(option)} aria-pressed={form.scope.includes(option)}>
                      <i>{form.scope.includes(option) ? <Check size={12} /> : '+'}</i><span>{option}</span>
                    </GlowEdge>
                  ))}
                </div>
              </div>
            )}

            {!isApp && <div className="field-row form-choice-row">
              <div className="field form-section">
                <span>{t('form.budget')}</span>
                <div className="chips compact-choices">
                  {BUDGETS.map(option => (
                    <GlowEdge as="button" type="button" key={option} className={`chip ${form.budget === option ? 'is-active' : ''}`} onClick={() => setForm(current => ({ ...current, budget: current.budget === option ? '' : option }))}>{option}</GlowEdge>
                  ))}
                </div>
              </div>
              <div className="field form-section">
                <span>{t('form.timeline')}</span>
                <div className="chips compact-choices">
                  {TIMELINES.map(option => (
                    <GlowEdge as="button" type="button" key={option} className={`chip ${form.timeline === option ? 'is-active' : ''}`} onClick={() => setForm(current => ({ ...current, timeline: current.timeline === option ? '' : option }))}>{option}</GlowEdge>
                  ))}
                </div>
              </div>
            </div>}

            <label className={`field ${touched && !messageValid ? 'has-error' : ''}`}>
              <span>{t('form.message')}</span>
              <textarea name="message" value={form.message} onChange={update} rows="6" placeholder={isApp ? t(`form.placeholder.${form.requestType || 'bug'}`) : t('form.messagePlaceholder')} />
              {touched && !messageValid && <i className="field-error">{t('form.messageError')}</i>}
            </label>

            <div className="form-nav">
              <span className="form-hint">{t('form.hint')}</span>
              <button type="button" className="btn btn-primary" onClick={next}>{t('form.next')} <ArrowRight size={17} /></button>
            </div>
          </motion.div>
        ) : (
          <motion.div className="form-stage" key="stage-contact" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }}>
            <div className="field-row">
              <label className={`field ${touched && form.name.trim().length < 2 ? 'has-error' : ''}`}>
                <span>{t('form.name')}</span>
                <input name="name" value={form.name} onChange={update} autoComplete="name" placeholder={t('form.namePlaceholder')} />
              </label>
              <label className="field">
                <span>{t('form.company')}</span>
                <input name="company" value={form.company} onChange={update} autoComplete="organization" placeholder={t('form.optional')} />
              </label>
            </div>

            <div className="field-row">
              <label className={`field ${touched && !isEmail(form.email) ? 'has-error' : ''}`}>
                <span>{t('form.email')}</span>
                <input type="email" name="email" value={form.email} onChange={update} autoComplete="email" placeholder={t('form.emailPlaceholder')} />
              </label>
              <label className={`field ${touched && form.contactMethod === 'phone' && form.phone.trim().length < 6 ? 'has-error' : ''}`}>
                <span>{t('form.phone')} {form.contactMethod === 'phone' ? '*' : ''}</span>
                <input type="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" placeholder={t('form.phonePlaceholder')} />
              </label>
            </div>

            <div className="field form-section">
              <span>{t('form.method')}</span>
              <div className="method-choice">
                {[['email', t('form.byEmail'), Mail], ['phone', t('form.byPhone'), Phone]].map(([value, label, Icon]) => (
                  <button type="button" key={value} className={form.contactMethod === value ? 'is-active' : ''} onClick={() => setForm(current => ({ ...current, contactMethod: value }))} aria-pressed={form.contactMethod === value}>
                    <Icon size={15} />{label}
                  </button>
                ))}
              </div>
            </div>

            <label className="honeypot" aria-hidden="true">
              <span>{t('form.website')}</span>
              <input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off" />
            </label>

            <label className={`consent ${touched && !form.consent ? 'has-error' : ''}`}>
              <input type="checkbox" name="consent" checked={form.consent} onChange={update} />
              <span>{t('form.consent')}</span>
            </label>

            <div className="form-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={16} /> {t(isApp ? 'form.backApp' : 'form.back')}</button>
              <button type="submit" className="btn btn-primary" disabled={state.status === 'loading'}>
                {state.status === 'loading' ? <><LoaderCircle className="spin" size={18} /> {t('form.sending')}</> : <>{t('form.send')} <Send size={17} /></>}
              </button>
            </div>

            {touched && !stepTwoValid && <p className="form-error">{t('form.invalid')}</p>}
            {state.status === 'error' && <p className="form-error" role="alert">{state.message}</p>}
          </motion.div>
        )}
      </div>
    </form>
  )
}
