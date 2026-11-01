import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, LoaderCircle, RotateCcw } from 'lucide-react'
import { api, json, uid } from '../lib/api'
import { Area, Field, LangTabs, toast, Repeater, SaveBar, Text, Toggle } from './parts'

/**
 * Teksty strony głównej i portfolio. Prace mają własną zakładkę, bo są
 * osobnym zbiorem danych – tutaj ustawia się tylko nagłówki sekcji, w których
 * się pokazują.
 */

/**
 * Edytor listy prostych łańcuchów. Textarea trzyma surowy tekst, żeby dało się
 * wpisywać puste linie, a model dostaje już oczyszczone pozycje.
 */
function Lines({ label, value = [], onChange, hint, rows = 4 }) {
  const joined = value.join('\n')
  const [text, setText] = useState(joined)

  useEffect(() => {
    setText(current => (
      current.split('\n').map(line => line.trim()).filter(Boolean).join('\n') === joined ? current : joined
    ))
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
        <Text label="Nagłówek – część wyróżniona" value={data.accent} onChange={accent => patch({ accent })} />
      </div>
      {withLead && <Area label="Opis sekcji" value={data.lead} onChange={lead => patch({ lead })} rows={2} />}
    </>
  )
}

export default function ContentManager({ notify, item = '', onItem = () => {} }) {
  // Wersja językowa siedzi w adresie: /admin/tresci albo /admin/tresci/en.
  const lang = item === 'en' ? 'en' : 'pl'
  const [draft, setDraft] = useState(null)
  const [original, setOriginal] = useState(null)
  const [open, setOpen] = useState('hero')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setDraft(null)
      const content = await api(`/api/admin/content?lang=${lang}`)
      setDraft(structuredClone(content))
      setOriginal(structuredClone(content))
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  useEffect(() => { load() }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const switchLang = next => {
    if (next === lang) return
    if (dirty && !window.confirm('Masz niezapisane zmiany. Przełączyć język i je odrzucić?')) return
    onItem(next === 'en' ? 'en' : '')
  }

  const dirty = useMemo(
    () => Boolean(draft && original) && JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original],
  )

  const patch = (key, value) => setDraft(current => ({ ...current, [key]: { ...current[key], ...value } }))

  const save = async () => {
    setSaving(true)
    try {
      const saved = await api(`/api/admin/content?lang=${lang}`, json('PUT', draft))
      setDraft(structuredClone(saved))
      setOriginal(structuredClone(saved))
      notify(lang === 'en' ? 'Angielskie treści strony zostały zaktualizowane.' : 'Treści strony zostały zaktualizowane.')
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const resetAll = async () => {
    if (!window.confirm(`Przywrócić wszystkie teksty (${lang.toUpperCase()}) do wersji domyślnej?`)) return
    const content = await api(`/api/admin/content/reset?lang=${lang}`, json('POST', {}))
    setDraft(structuredClone(content))
    setOriginal(structuredClone(content))
    notify('Przywrócono treści domyślne.')
  }

  const tabs = (
    <LangTabs
      value={lang}
      onChange={switchLang}
      hint={lang === 'en' ? 'Teksty wersji angielskiej – strona pod /en.' : 'Teksty wersji polskiej – strona główna i /portfolio.'}
    />
  )

  if (!draft) {
    return <div className="ap-content-editor">{tabs}<div className="ap-inline-loading"><LoaderCircle className="spin" size={18} /> Wczytuję treści…</div></div>
  }

  const toggle = id => setOpen(id)

  return (
    <div className="ap-content-editor">

      {tabs}

      <div className="ap-content-intro">
        <p>Teksty strony głównej i portfolio. Same prace dodaje się w zakładce Portfolio.</p>
        <button className="ap-btn ap-btn-ghost" onClick={resetAll}><RotateCcw size={14} /> Przywróć domyślne</button>
      </div>

      <Section id="brand" title="Marka i dane kontaktowe" description="Nazwa, podpis i dane widoczne w nagłówku oraz stopce." open={open === 'brand'} onToggle={toggle}>
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

      <Section id="hero" title="Pierwszy ekran" description="Nagłówek, wprowadzenie i przyciski. Liczby pod nimi liczą się same z portfolio." open={open === 'hero'} onToggle={toggle}>
        <div className="ap-grid-2">
          <Text label="Nagłówek" value={draft.hero.titleTop} onChange={titleTop => patch('hero', { titleTop })} />
          <Text label="Nagłówek – część wyróżniona" value={draft.hero.titleAccent} onChange={titleAccent => patch('hero', { titleAccent })} />
        </div>
        <Area label="Wprowadzenie" value={draft.hero.lead} onChange={lead => patch('hero', { lead })} rows={3} />
        <div className="ap-grid-2">
          <Text label="Przycisk główny" value={draft.hero.primaryCta} onChange={primaryCta => patch('hero', { primaryCta })} />
          <Text label="Przycisk dodatkowy" value={draft.hero.secondaryCta} onChange={secondaryCta => patch('hero', { secondaryCta })} />
        </div>
      </Section>

      <Section id="projects" title="Portfolio na stronie głównej" description="Nagłówek sekcji z wybranymi pracami." open={open === 'projects'} onToggle={toggle}>
        <HeadFields data={draft.projects} patch={value => patch('projects', value)} />
        <div className="ap-grid-2">
          <Text label="Przycisk do katalogu" value={draft.projects.catalogCta} onChange={catalogCta => patch('projects', { catalogCta })} />
          <Text label="Tekst przy pustym portfolio" value={draft.projects.empty} onChange={empty => patch('projects', { empty })} />
        </div>
      </Section>

      <Section id="catalog" title="Całe portfolio" description="Teksty strony /portfolio i nazwy filtrów." open={open === 'catalog'} onToggle={toggle}>
        <HeadFields data={draft.catalog} patch={value => patch('catalog', value)} />
        <div className="ap-grid-3">
          <Text label="Filtr: wszystko" value={draft.catalog.filterAll} onChange={filterAll => patch('catalog', { filterAll })} />
          <Text label="Filtr: strony" value={draft.catalog.filterWeb} onChange={filterWeb => patch('catalog', { filterWeb })} />
          <Text label="Filtr: aplikacje" value={draft.catalog.filterApp} onChange={filterApp => patch('catalog', { filterApp })} />
        </div>
        {lang !== 'en' && (
          <Toggle
            label="Pokazuj historię zmian aplikacji"
            hint="Notatki z ostatnich wydań pod plikami do pobrania – wspólne dla obu języków."
            checked={draft.catalog.showChangelog === true}
            onChange={showChangelog => patch('catalog', { showChangelog })}
          />
        )}
      </Section>

      <Section id="scope" title="Zakres" description="Lista obszarów, którymi się zajmujesz." open={open === 'scope'} onToggle={toggle}>
        <HeadFields data={draft.scope} patch={value => patch('scope', value)} />
        <Repeater
          items={draft.scope.items}
          onChange={items => patch('scope', { items })}
          create={() => ({ id: uid(), title: '', lead: '', detail: '' })}
          addLabel="Dodaj obszar"
          itemLabel={item => item.title || 'Obszar'}
          render={(item, update) => (
            <>
              <div className="ap-grid-2">
                <Text label="Nazwa" value={item.title} onChange={title => update({ title })} />
                <Text label="Hasło" value={item.lead} onChange={lead => update({ lead })} />
              </div>
              <Area label="Opis" value={item.detail} onChange={detail => update({ detail })} rows={3} />
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

      <Section id="pagesSection" title="Sekcja podstron" description="Nagłówek listy podstron oferty na stronie głównej." open={open === 'pagesSection'} onToggle={toggle}>
        <HeadFields data={draft.pagesSection} patch={value => patch('pagesSection', value)} />
      </Section>

      <Section id="about" title="O mnie" description="Nagłówek, wprowadzenie, opis i lista kompetencji." open={open === 'about'} onToggle={toggle}>
        <HeadFields data={draft.about} patch={value => patch('about', value)} withLead={false} />
        <Area label="Zdanie przewodnie" value={draft.about.lead} onChange={lead => patch('about', { lead })} rows={2} />
        <Area label="Opis" value={draft.about.text} onChange={text => patch('about', { text })} rows={7}
          hint="Akapity rozdzielaj pustą linią." />
        <Lines label="Kompetencje" value={draft.about.strengths} onChange={strengths => patch('about', { strengths })} rows={6} />
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
