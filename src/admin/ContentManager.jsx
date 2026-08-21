import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { api, json, uid } from '../lib/api'
import { Area, Dropzone, Field, Notice, Repeater, SaveBar, Text, Toggle, useMedia } from './parts'

/**
 * Newline-separated editor for arrays of plain strings. The textarea keeps its
 * raw text so blank lines can be typed, while the model receives clean entries.
 */
function Lines({ label, value = [], onChange, hint, rows = 4 }) {
  const joined = value.join('\n')
  const [text, setText] = useState(joined)

  useEffect(() => {
    setText(current => (current.split('\n').map(line => line.trim()).filter(Boolean).join('\n') === joined ? current : joined))
  }, [joined])

  return (
    <Field label={label} hint={hint || 'Każda linia to osobna pozycja.'} wide>
      <textarea
        rows={rows}
        value={text}
        onChange={event => {
          setText(event.target.value)
          onChange(event.target.value.split('\n').map(line => line.trim()).filter(Boolean))
        }}
      />
    </Field>
  )
}

function ImageList({ label, value = [], onChange }) {
  const { busy, upload } = useMedia()
  return (
    <div className="ap-image-list">
      <span className="ap-field-label">{label}</span>
      <Dropzone
        compact
        busy={busy}
        onFiles={async files => {
          const uploaded = await upload(files)
          onChange([...value, ...uploaded.map(file => file.url)])
        }}
      />
      <div className="ap-image-strip">
        {value.map((src, index) => (
          <figure key={`${src}-${index}`}>
            <img src={src} alt="" />
            <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label="Usuń"><Trash2 size={12} /></button>
          </figure>
        ))}
        {!value.length && <span className="ap-hint">Brak zrzutów ekranu.</span>}
      </div>
    </div>
  )
}

function Section({ id, title, description, open, onToggle, children }) {
  return (
    <section className={`ap-section ${open ? 'is-open' : ''}`}>
      <button type="button" className="ap-section-head" onClick={() => onToggle(open ? '' : id)} aria-expanded={open}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <ChevronDown size={18} />
      </button>
      {open && <div className="ap-section-body">{children}</div>}
    </section>
  )
}

function HeadFields({ data, patch, withLead = true }) {
  return (
    <>
      <div className="ap-grid-2">
        <Text label="Nagłówek" value={data.title} onChange={title => patch({ title })} />
        <Text label="Nagłówek — część wyróżniona" value={data.accent} onChange={accent => patch({ accent })} />
      </div>
      {withLead && <Area label="Opis sekcji" value={data.lead} onChange={lead => patch({ lead })} rows={2} />}
    </>
  )
}

export default function ContentManager({ notify }) {
  const [draft, setDraft] = useState(null)
  const [original, setOriginal] = useState(null)
  const [open, setOpen] = useState('hero')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const content = await api('/api/admin/content')
      setDraft(structuredClone(content))
      setOriginal(structuredClone(content))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  useEffect(() => { load() }, [])

  const dirty = useMemo(
    () => Boolean(draft && original) && JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original],
  )

  const patch = (key, value) => setDraft(current => ({ ...current, [key]: { ...current[key], ...value } }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await api('/api/admin/content', json('PUT', draft))
      setDraft(structuredClone(saved))
      setOriginal(structuredClone(saved))
      notify('Treści strony zostały zaktualizowane.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const resetAll = async () => {
    if (!window.confirm('Przywrócić wszystkie teksty do wersji domyślnej?')) return
    const content = await api('/api/admin/content/reset', json('POST', {}))
    setDraft(structuredClone(content))
    setOriginal(structuredClone(content))
    notify('Przywrócono treści domyślne.')
  }

  if (!draft) {
    return <div className="ap-inline-loading"><LoaderCircle className="spin" size={18} /> Wczytuję treści…</div>
  }

  const toggle = id => setOpen(id)

  return (
    <div className="ap-content-editor">
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <div className="ap-content-intro">
        <p>Wszystkie teksty widoczne na stronie głównej. Zmiany pojawiają się od razu po zapisaniu.</p>
        <button className="ap-btn ap-btn-ghost" onClick={resetAll}><RotateCcw size={14} /> Przywróć domyślne</button>
      </div>

      <Section id="brand" title="Marka i dane kontaktowe" description="Nazwa, inicjały, podpis i dane widoczne w stopce." open={open === 'brand'} onToggle={toggle}>
        <div className="ap-grid-3">
          <Text label="Inicjały" value={draft.brand.initials} onChange={initials => patch('brand', { initials })} />
          <Text label="Imię i nazwisko" value={draft.brand.name} onChange={name => patch('brand', { name })} />
          <Text label="Podpis / rola" value={draft.brand.role} onChange={role => patch('brand', { role })} />
        </div>
        <div className="ap-grid-2">
          <Text label="Hasło (tagline)" value={draft.brand.tagline} onChange={tagline => patch('brand', { tagline })} />
          <Text label="Lokalizacja" value={draft.brand.location} onChange={location => patch('brand', { location })} />
        </div>
        <div className="ap-grid-2">
          <Text label="E-mail publiczny" value={draft.brand.email} onChange={email => patch('brand', { email })} hint="Puste = ukryte na stronie." />
          <Text label="Telefon publiczny" value={draft.brand.phone} onChange={phone => patch('brand', { phone })} hint="Puste = ukryte na stronie." />
        </div>
      </Section>

      <Section id="hero" title="Sekcja powitalna" description="Pierwszy ekran: nagłówek, wprowadzenie i pasek kompetencji." open={open === 'hero'} onToggle={toggle}>
        <div className="ap-grid-2">
          <Text label="Nagłówek" value={draft.hero.titleTop} onChange={titleTop => patch('hero', { titleTop })} />
          <Text label="Nagłówek — część wyróżniona" value={draft.hero.titleAccent} onChange={titleAccent => patch('hero', { titleAccent })} />
        </div>
        <Area label="Wprowadzenie" value={draft.hero.lead} onChange={lead => patch('hero', { lead })} rows={3} />
        <div className="ap-grid-2">
          <Text label="Przycisk główny" value={draft.hero.primaryCta} onChange={primaryCta => patch('hero', { primaryCta })} />
          <Text label="Przycisk dodatkowy" value={draft.hero.secondaryCta} onChange={secondaryCta => patch('hero', { secondaryCta })} />
        </div>
        <Lines label="Pasek kompetencji" value={draft.hero.marquee} onChange={marquee => patch('hero', { marquee })} rows={5} />
      </Section>

      <Section id="manifesto" title="Manifest" description="Zdanie przewodnie odsłaniane przy przewijaniu." open={open === 'manifesto'} onToggle={toggle}>
        <Lines label="Zdania" value={draft.manifesto.lines} onChange={lines => patch('manifesto', { lines })} rows={4} hint="Każda linia to osobne zdanie manifestu." />
        <Area label="Notatka boczna" value={draft.manifesto.note} onChange={note => patch('manifesto', { note })} rows={3} />
      </Section>

      <Section id="services" title="Zakres usług" description="Interaktywna lista usług z opisem." open={open === 'services'} onToggle={toggle}>
        <HeadFields data={draft.services} patch={value => patch('services', value)} />
        <Repeater
          items={draft.services.items}
          onChange={items => patch('services', { items })}
          create={() => ({ id: uid(), no: '00', title: '', lead: '', detail: '' })}
          addLabel="Dodaj usługę"
          itemLabel={item => item.title || 'Usługa'}
          render={(item, update) => (
            <>
              <div className="ap-grid-3">
                <Text label="Numer" value={item.no} onChange={no => update({ no })} />
                <Text label="Nazwa" value={item.title} onChange={title => update({ title })} />
                <Text label="Hasło" value={item.lead} onChange={lead => update({ lead })} />
              </div>
              <Area label="Opis" value={item.detail} onChange={detail => update({ detail })} rows={3} />
            </>
          )}
        />
      </Section>

      <Section id="intelligence" title="Sekcja AI" description="Trzy karty pokazujące rolę AI w produkcie." open={open === 'intelligence'} onToggle={toggle}>
        <HeadFields data={draft.intelligence} patch={value => patch('intelligence', value)} withLead={false} />
        <Repeater
          items={draft.intelligence.cards}
          onChange={cards => patch('intelligence', { cards })}
          create={() => ({ no: '', title: '', text: '' })}
          addLabel="Dodaj kartę"
          itemLabel={item => item.title || 'Karta'}
          render={(item, update) => (
            <>
              <div className="ap-grid-2">
                <Text label="Etykieta" value={item.no} onChange={no => update({ no })} placeholder="01 / CZYTA" />
                <Text label="Tytuł" value={item.title} onChange={title => update({ title })} />
              </div>
              <Area label="Opis" value={item.text} onChange={text => update({ text })} rows={2} />
            </>
          )}
        />
        <Lines label="Łańcuch pod kartami" value={draft.intelligence.chain} onChange={chain => patch('intelligence', { chain })} />
      </Section>

      <Section id="work" title="Realizacje" description="Portfolio z zakładkami i zrzutami ekranu." open={open === 'work'} onToggle={toggle}>
        <HeadFields data={draft.work} patch={value => patch('work', value)} />
        <Repeater
          items={draft.work.items}
          onChange={items => patch('work', { items })}
          create={() => ({ id: uid(), name: '', href: 'https://', label: '', statement: '', description: '', features: [], slides: [], hidden: false })}
          addLabel="Dodaj realizację"
          itemLabel={item => item.name || 'Realizacja'}
          render={(item, update) => (
            <>
              <div className="ap-grid-3">
                <Text label="Nazwa" value={item.name} onChange={name => update({ name })} />
                <Text label="Adres" value={item.href} onChange={href => update({ href })} />
                <Text label="Etykieta" value={item.label} onChange={label => update({ label })} />
              </div>
              <Text label="Zdanie przewodnie" value={item.statement} onChange={statement => update({ statement })} wide />
              <Area label="Opis" value={item.description} onChange={description => update({ description })} rows={3} />
              <Toggle
                label="Widoczna publicznie"
                hint="Wyłącz, aby zachować realizację w panelu bez ujawniania jej na stronie."
                checked={item.hidden !== true}
                onChange={visible => update({ hidden: !visible })}
              />
              <Lines label="Funkcje" value={item.features} onChange={features => update({ features })} />
              <ImageList label="Zrzuty ekranu" value={item.slides} onChange={slides => update({ slides })} />
            </>
          )}
        />
      </Section>

      <Section id="process" title="Proces" description="Etapy współpracy na osi czasu." open={open === 'process'} onToggle={toggle}>
        <HeadFields data={draft.process} patch={value => patch('process', value)} />
        <Repeater
          items={draft.process.items}
          onChange={items => patch('process', { items })}
          create={() => ({ no: '', title: '', text: '' })}
          addLabel="Dodaj etap"
          itemLabel={item => item.title || 'Etap'}
          render={(item, update) => (
            <>
              <div className="ap-grid-2">
                <Text label="Numer" value={item.no} onChange={no => update({ no })} />
                <Text label="Nazwa" value={item.title} onChange={title => update({ title })} />
              </div>
              <Area label="Opis" value={item.text} onChange={text => update({ text })} rows={2} />
            </>
          )}
        />
      </Section>

      <Section id="about" title="O mnie" description="Opis i podpis." open={open === 'about'} onToggle={toggle}>
        <HeadFields data={draft.about} patch={value => patch('about', value)} withLead={false} />
        <Area label="Zdanie przewodnie" value={draft.about.lead} onChange={lead => patch('about', { lead })} rows={2} />
        <Area label="Opis" value={draft.about.text} onChange={text => patch('about', { text })} rows={4} />
        <Lines label="Kompetencje" value={draft.about.strengths} onChange={strengths => patch('about', { strengths })} rows={5} />
      </Section>

      <Section id="faq" title="FAQ" description="Najczęstsze pytania i odpowiedzi." open={open === 'faq'} onToggle={toggle}>
        <HeadFields data={draft.faq} patch={value => patch('faq', value)} withLead={false} />
        <Repeater
          items={draft.faq.items}
          onChange={items => patch('faq', { items })}
          create={() => ({ q: '', a: '' })}
          addLabel="Dodaj pytanie"
          itemLabel={item => item.q || 'Pytanie'}
          render={(item, update) => (
            <>
              <Text label="Pytanie" value={item.q} onChange={q => update({ q })} wide />
              <Area label="Odpowiedź" value={item.a} onChange={a => update({ a })} rows={3} />
            </>
          )}
        />
      </Section>

      <Section id="pagesSection" title="Sekcja podstron" description="Nagłówek listy podstron na stronie głównej." open={open === 'pagesSection'} onToggle={toggle}>
        <HeadFields data={draft.pagesSection} patch={value => patch('pagesSection', value)} />
      </Section>

      <Section id="contact" title="Kontakt" description="Nagłówek nad formularzem." open={open === 'contact'} onToggle={toggle}>
        <HeadFields data={draft.contact} patch={value => patch('contact', value)} />
      </Section>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onReset={() => setDraft(structuredClone(original))}
        resetLabel="Odrzuć zmiany"
      />
    </div>
  )
}
