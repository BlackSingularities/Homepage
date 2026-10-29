import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { api } from '../lib/api'
import { PLATFORM_LABEL } from '../lib/projects'
import { Card, Empty } from './parts'
import StoreIcon, { STORE_LABEL } from '../lib/StoreIcon'

const RANGES = [[7, '7 dni'], [30, '30 dni'], [90, '90 dni'], [365, 'Rok']]
const DEVICE_LABEL = { desktop: 'Komputer', mobile: 'Telefon', tablet: 'Tablet' }
const SOURCE_LABEL = { github: 'GitHub', manual: 'Ręczne pliki', none: 'Brak plików' }

const number = value => new Intl.NumberFormat('pl-PL').format(value || 0)

function duration(ms) {
  if (!ms) return '–'
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

function Delta({ now, before, invert }) {
  if (!before) return null
  const change = Math.round(((now - before) / before) * 100)
  if (!change) return <em className="an-delta">bez zmian</em>
  const good = invert ? change < 0 : change > 0
  return <em className={`an-delta ${good ? 'is-up' : 'is-down'}`}>{change > 0 ? '+' : ''}{change}% vs poprzedni okres</em>
}

/** Dzienny wykres słupkowy: odsłony, a w nich unikalni odwiedzający. */
function Trend({ series }) {
  const max = Math.max(1, ...series.map(item => item.views))
  const [hover, setHover] = useState(null)
  const active = hover === null ? null : series[hover]
  return (
    <div className="an-trend">
      <div className="an-trend-info mono">
        {active
          ? <>{active.day} · {number(active.views)} odsłon · {number(active.visitors)} osób · {number(active.downloads)} pobrań · {number(active.stores)} do sklepów</>
          : <>najedź na słupek, żeby zobaczyć dzień</>}
      </div>
      <div className="an-bars" onMouseLeave={() => setHover(null)}>
        {series.map((item, index) => (
          <span key={item.day} className={hover === index ? 'is-active' : ''} onMouseEnter={() => setHover(index)}>
            <i style={{ height: `${(item.views / max) * 100}%` }} />
            <b style={{ height: `${(item.visitors / max) * 100}%` }} />
          </span>
        ))}
      </div>
      <div className="an-legend"><span><i /> odsłony</span><span><b /> unikalni odwiedzający</span></div>
    </div>
  )
}

function Ranking({ title, description, items, label = key => key }) {
  const max = Math.max(1, ...items.map(item => item.count))
  return (
    <Card title={title} description={description}>
      {items.length === 0 ? <Empty>Brak danych.</Empty> : (
        <ul className="an-rank">
          {items.map(item => (
            <li key={item.key}>
              <span className="an-rank-bar" style={{ width: `${(item.count / max) * 100}%` }} />
              <span className="an-rank-label">{label(item.key)}</span>
              <b className="mono">{number(item.count)}</b>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Hours({ hours }) {
  const max = Math.max(1, ...hours)
  return (
    <Card title="Pora dnia" description="Odsłony według godziny (czas serwera).">
      <div className="an-hours">
        {hours.map((count, hour) => (
          <span key={hour} title={`${hour}:00 – ${count} odsłon`}>
            <i style={{ opacity: 0.12 + (count / max) * 0.88 }} />
            <em className="mono">{hour % 3 === 0 ? hour : ''}</em>
          </span>
        ))}
      </div>
    </Card>
  )
}

export default function AnalyticsPanel() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async span => {
    setError('')
    try {
      setData(await api(`/api/admin/analytics?days=${span}`))
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => { load(days) }, [days, load])

  if (error) return <Empty>{error}</Empty>
  if (!data) return <div className="page-state"><LoaderCircle className="spin" size={22} /></div>

  const { totals, previous } = data
  const stats = [
    ['Odsłony', number(totals.pageviews), <Delta now={totals.pageviews} before={previous.pageviews} />],
    ['Unikalni odwiedzający', number(totals.visitors), <Delta now={totals.visitors} before={previous.visitors} />],
    ['Sesje', number(totals.sessions), <Delta now={totals.sessions} before={previous.sessions} />],
    ['Kliknięcia „pobierz”', number(totals.downloads), <Delta now={totals.downloads} before={previous.downloads} />],
    ['Przejścia do sklepów', number(totals.stores), <Delta now={totals.stores} before={previous.stores} />],
    ['Nowi odwiedzający', number(totals.newVisitors), null],
    ['Stron na sesję', totals.pagesPerSession.toLocaleString('pl-PL'), null],
    ['Współczynnik odrzuceń', `${totals.bounceRate}%`, <Delta now={totals.bounceRate} before={previous.bounceRate} invert />],
    ['Średni czas na podstronie', duration(totals.avgTimeMs), null],
  ]
  const allDownloads = data.apps.reduce((sum, app) => sum + app.total, 0)
  const allSite = data.apps.reduce((sum, app) => sum + (app.siteTotal || 0), 0)
  const allStores = data.apps.reduce((sum, app) => sum + (app.storeTotal || 0), 0)

  return (
    <div className="ap-stack">
      <div className="ap-filters">
        {RANGES.map(([value, label]) => (
          <button key={value} className={days === value ? 'is-active' : ''} onClick={() => setDays(value)}>{label}</button>
        ))}
      </div>

      <div className="an-stats">
        {stats.map(([label, value, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
            {delta}
          </div>
        ))}
      </div>

      <Card
        title="Ruch dzień po dniu"
        description={`Zgoda na statystyki: ${data.consent.granted} × tak, ${data.consent.denied} × nie. ${data.consent.share}% odsłon ma pełne dane – reszta jest liczona anonimowo, bez unikalnych osób.`}
      >
        <Trend series={data.series} />
      </Card>

      <Card
        title="Pobrania aplikacji"
        description={`Łącznie ${number(allDownloads)} pobrań, w tym ${number(allSite)} kliknięć na tej stronie. Dla wydań z GitHuba liczba zbiorcza pochodzi z GitHuba i obejmuje też pobrania spoza strony – kolumna „stąd” liczy wyłącznie kliknięcia w portfolio. Przejścia do sklepów: ${number(allStores)} – samej instalacji sklep nie zgłasza.`}
      >
        {data.apps.length === 0 ? <Empty>Brak aplikacji w portfolio.</Empty> : (
          <div className="an-apps">
            {data.apps.map(app => (
              <article key={app.slug}>
                <header>
                  <strong>{app.name}</strong>
                  <span className="mono">{SOURCE_LABEL[app.source] || app.source}</span>
                  <b className="mono">{number(app.total)}</b>
                </header>

                <p className="an-apps-site">
                  Ze strony: <b className="mono">{number(app.siteTotal)}</b> od początku,
                  {' '}<b className="mono">{number(app.sitePeriod)}</b> w wybranym okresie.
                </p>

                {app.stores?.length > 0 && (
                  <ul className="an-apps-stores">
                    {app.stores.map(store => (
                      <li key={store.id}>
                        <span><StoreIcon store={store.id} size={13} aria-hidden="true" /> {store.name}</span>
                        <a className="mono" href={store.url} target="_blank" rel="noreferrer">{store.url.replace(/^https:\/\//, '')}</a>
                        <span className="an-apps-own mono" title="Przejścia ze strony do sklepu (w okresie)">
                          w okresie {number(store.period)}
                        </span>
                        <b className="mono">{number(store.total)}</b>
                      </li>
                    ))}
                  </ul>
                )}

                {app.files.length > 0 && (
                  <ul>
                    {app.files.map(file => (
                      <li key={file.id}>
                        <span>{PLATFORM_LABEL[file.platform] || file.platform}</span>
                        <span className="mono">{[file.label, file.version].filter(Boolean).join(' · ') || '—'}</span>
                        <span className="an-apps-own mono" title="Kliknięcia na tej stronie (od początku / w okresie)">
                          stąd {number(file.site)} / {number(file.sitePeriod)}
                        </span>
                        <b className="mono">{number(file.count)}</b>
                      </li>
                    ))}
                  </ul>
                )}

                {app.versions.length > 0 && (
                  <div className="an-apps-versions">
                    <span>Pobierane wersje w okresie</span>
                    <ul>
                      {app.versions.map(item => (
                        <li key={item.version}>
                          <span className="mono">{item.version}</span>
                          <b className="mono">{number(item.count)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>

      <div className="ap-two">
        <Ranking title="Najczęściej oglądane" description="Podstrony według liczby odsłon." items={data.pages} />
        <Ranking title="Źródła wejść" description="Skąd przychodzą odwiedzający (tylko ze zgodą)." items={data.referrers} />
        <Ranking title="Kliknięcia pobierania" description="Według aplikacji, w wybranym okresie." items={data.downloadsByProject} />
        <Ranking title="Pobrania wg platformy" items={data.downloadsByPlatform} label={key => PLATFORM_LABEL[key] || key} />
        <Ranking title="Przejścia do sklepów" description="Według aplikacji, w wybranym okresie." items={data.storesByProject || []} />
        <Ranking title="Przejścia wg sklepu" items={data.storesByStore || []} label={key => STORE_LABEL[key] || key} />
        <Ranking title="Urządzenia" items={data.devices} label={key => DEVICE_LABEL[key] || key} />
        <Hours hours={data.hours} />
        <Ranking title="Przeglądarki" items={data.browsers} />
        <Ranking title="Systemy" items={data.systems} />
        <Ranking title="Języki" items={data.languages} />
        <Ranking title="Rozdzielczości ekranu" items={data.screens} />
        {data.campaigns.length > 0 && <Ranking title="Kampanie (utm_source)" items={data.campaigns} />}
      </div>
    </div>
  )
}
