import { ArrowRight, Box, Check, Database, Layers, Mail, Map as MapIcon, Scissors, Sparkles } from 'lucide-react'
import { useT } from '../lib/i18n'
import { Reveal } from '../lib/ui'

/**
 * Baner GRAŃ Premium na stronie GRANI w portfolio: jednorazowy dostęp do GRAŃ Studio.
 * Nie ma tu płatności – osoba zainteresowana pisze, a dostęp włączam ręcznie w panelu
 * (konto premium w „Zarządzanie aplikacjami → Grań”).
 */

const COPY = {
  pl: {
    kicker: 'GRAŃ Premium',
    title: 'GRAŃ Studio – profesjonalne wycinki terenu',
    lead: 'Studio zamienia dowolny fragment mapy w model 3D do druku, mapę wektorową do składu albo przekrój terenu. Dostęp jest jednorazowy i przypisany do Twojego konta GRAŃ – bez abonamentu.',
    price: '99 zł',
    priceNote: 'jednorazowo · bez subskrypcji',
    interest: 'Jeśli jesteś zainteresowany, napisz do mnie – odpowiem, prześlę szczegóły płatności i włączę dostęp na Twoim koncie.',
    cta: 'Napisz w sprawie Premium',
    mail: 'Wyślij e-mail',
    subject: 'GRAŃ Premium – dostęp do Studio',
    includes: 'W cenie',
    formats: 'Formaty plików',
    perks: [
      'Wszystkie funkcje Studio na Windows 10/11',
      'Dostęp na stałe, przypisany do konta GRAŃ',
      'Nowe funkcje Studio w kolejnych wersjach',
      'Wyniki także do użytku komercyjnego – z automatycznym podpisem źródeł danych',
    ],
    groups: [
      {
        icon: 'model',
        title: 'Modele 3D',
        items: [
          'STL do druku 3D – szczelna bryła z podstawą, do 1000 mm',
          'GLB z materiałami PBR, OBJ/MTL z teksturami, PLY z kolorami',
          'Materiały: łąki, lasy, skały, piargi, śnieg, wody, budynki',
          'Ściany z warstwami skalnymi, przewyższenie, podgląd na żywo',
        ],
      },
      {
        icon: 'map',
        title: 'Mapy wektorowe',
        items: [
          'SVG z zagnieżdżonymi warstwami (Inkscape, Illustrator, Affinity)',
          'PDF z warstwami do druku, DXF do CAD, PNG w wybranej rozdzielczości',
          'Arkusze A4–A0 i B2–B1, cztery style, kroje pisma, cieniowanie rzeźby',
          'Warstwice z opisami, szlaki w kolorach, siatka, legenda, podziałka',
          'Menedżer warstw: kolor, krycie, grubość, ukrywanie, osobne pliki',
        ],
      },
      {
        icon: 'section',
        title: 'Przekroje',
        items: [
          'Profil pionowy wzdłuż linii A–B z nazwami szczytów i szlaków',
          'Płaszczyzna pozioma (dokładna warstwica) i ukośna z kątem upadu',
          'Zapis SVG, PDF, DXF, PNG, profil także jako CSV',
        ],
      },
      {
        icon: 'data',
        title: 'Dane i obszar',
        items: [
          'Teren z lotniczego skanowania GUGiK (Polska) i ČÚZK (Czechy), ok. 1 m',
          'Copernicus GLO-30 dla całego świata, obiekty z OpenStreetMap',
          'Prostokąt, koło, wielokąt albo pas wzdłuż grani; odcięcie wysokością',
          'Obraz terenu PNG, mapa wysokości 16-bit, warstwice GeoJSON',
        ],
      },
    ],
  },
  en: {
    kicker: 'GRAŃ Premium',
    title: 'GRAŃ Studio – professional terrain cut-outs',
    lead: 'Studio turns any part of the map into a 3D model for printing, a vector map for layout or a terrain cross-section. Access is a one-time purchase tied to your GRAŃ account – no subscription.',
    price: '99 PLN',
    priceNote: 'one-time · no subscription',
    interest: 'If you are interested, write to me – I will reply, send the payment details and switch the access on for your account.',
    cta: 'Ask about Premium',
    mail: 'Send an e-mail',
    subject: 'GRAŃ Premium – Studio access',
    includes: 'Included',
    formats: 'File formats',
    perks: [
      'All Studio features on Windows 10/11',
      'Permanent access tied to your GRAŃ account',
      'New Studio features in future versions',
      'Results usable commercially too – with data sources credited automatically',
    ],
    groups: [
      {
        icon: 'model',
        title: '3D models',
        items: [
          'STL for 3D printing – watertight solid with a base, up to 1000 mm',
          'GLB with PBR materials, OBJ/MTL with textures, PLY with colours',
          'Materials: meadows, forests, rock, scree, snow, water, buildings',
          'Side walls with rock strata, vertical exaggeration, live preview',
        ],
      },
      {
        icon: 'map',
        title: 'Vector maps',
        items: [
          'SVG with nested layers (Inkscape, Illustrator, Affinity)',
          'Layered PDF for print, DXF for CAD, PNG at any resolution',
          'A4–A0 and B2–B1 sheets, four styles, typefaces, hillshade',
          'Labelled contours, coloured trails, grid, legend, scale bar',
          'Layer manager: colour, opacity, weight, hiding, separate files',
        ],
      },
      {
        icon: 'section',
        title: 'Cross-sections',
        items: [
          'Vertical profile along an A–B line with peak and trail names',
          'Horizontal plane (exact contour) and inclined plane with dip angle',
          'SVG, PDF, DXF, PNG – the profile also as CSV',
        ],
      },
      {
        icon: 'data',
        title: 'Data and area',
        items: [
          'Airborne-laser terrain from GUGiK (Poland) and ČÚZK (Czechia), about 1 m',
          'Copernicus GLO-30 worldwide, features from OpenStreetMap',
          'Rectangle, circle, polygon or a strip along a ridge; cut by elevation',
          'Terrain image PNG, 16-bit heightmap, GeoJSON contours',
        ],
      },
    ],
  },
}

const FORMATS = ['STL', 'GLB', 'OBJ', 'PLY', 'SVG', 'PDF', 'DXF', 'PNG', 'CSV', 'GeoJSON']

const ICONS = { model: Box, map: MapIcon, section: Scissors, data: Database }

export default function GranPremium({ email, onNavigate }) {
  const { lang, lp } = useT()
  const c = COPY[lang] || COPY.pl
  const contact = lp('/#kontakt')
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent(c.subject)}` : null

  return (
    <Reveal as="section" className="gp" id="premium" aria-labelledby="gp-title">
      <div className="gp-head">
        <div className="gp-intro">
          <p className="gp-kicker"><Sparkles size={15} aria-hidden="true" /> {c.kicker}</p>
          <h2 id="gp-title">{c.title}</h2>
          <p className="gp-lead">{c.lead}</p>
          <ul className="gp-formats mono" aria-label={c.formats}>
            {FORMATS.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <aside className="gp-offer" aria-label={c.kicker}>
          <p className="gp-price"><strong>{c.price}</strong><span className="mono">{c.priceNote}</span></p>
          <p className="gp-includes">{c.includes}</p>
          <ul className="gp-perks">
            {c.perks.map(item => <li key={item}><Check size={14} aria-hidden="true" />{item}</li>)}
          </ul>
          <p className="gp-interest">{c.interest}</p>
          <div className="gp-actions">
            <a
              className="btn btn-primary"
              href={contact}
              onClick={event => { event.preventDefault(); onNavigate(contact) }}
            >
              {c.cta} <ArrowRight size={16} aria-hidden="true" />
            </a>
            {mailto && (
              <a className="btn btn-ghost" href={mailto}>
                <Mail size={16} aria-hidden="true" /> {c.mail}
              </a>
            )}
          </div>
        </aside>
      </div>

      <ul className="gp-groups">
        {c.groups.map(group => {
          const Icon = ICONS[group.icon] || Layers
          return (
            <li key={group.title} className="gp-group">
              <h3><span className="gp-icon"><Icon size={17} aria-hidden="true" /></span>{group.title}</h3>
              <ul>
                {group.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </li>
          )
        })}
      </ul>
    </Reveal>
  )
}
