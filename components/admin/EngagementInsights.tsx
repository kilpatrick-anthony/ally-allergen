'use client'

import { useState } from 'react'
import { Card } from '@/components/layout/Card'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { EngagementReport, EngagementRow } from '@/lib/analytics/engagement'

export default function EngagementInsights({ report }: { report?: EngagementReport }) {
  const { t, language } = useTranslation()
  const [source, setSource] = useState('all')
  const text = (key: string) => t(`engagementInsights.${key}`)
  if (!report?.available) return <Card className="mb-8"><h2 className="font-semibold">{text('title')}</h2><p className="mt-2 text-sm text-gray-600">{text('unavailable')}</p></Card>
  const percent = (n: number, total: number) => total ? `${Math.round(n / total * 100)}%` : '—'
  const label = (name: string) => ['removedAccessPoint', 'unassignedAccessPoint', 'unassignedLocation'].includes(name) ? text(name) : name
  const points = report.accessPoints.filter(point => source === 'all' || point.source === source)
  const maxBusy = Math.max(1, ...report.busy.map(cell => cell.sessions))
  const days = Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 5 + day))))

  function activityTable(rows: EngagementRow[], heading: string, isSource = false, showSource = false) {
    return <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{heading}</caption>
        <thead><tr className="border-b text-gray-500">
          <th scope="col" className="py-3 pr-4">{text('name')}</th>
          {showSource && <th scope="col" className="px-3">{text('source')}</th>}
          {['sessions', 'views', 'searches', 'filters', 'downloads'].map(key => <th scope="col" key={key} className="px-3 text-right">{text(key)}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700">
          <th scope="row" className="py-3 pr-4 font-medium">
            {isSource ? text(row.id) : label(row.name)}
            {showSource && row.siteId && <span className="block text-xs font-normal text-gray-500">{label(report?.locations.find(site => site.id === row.siteId)?.name || 'unassignedLocation')}</span>}
          </th>
          {showSource && <td className="px-3">{text(row.source || 'unknown')}</td>}
          {[row.sessions, row.views, row.searches, row.filters, row.downloads].map((value, i) => <td key={i} className="px-3 text-right tabular-nums">{value.toLocaleString(language)}</td>)}
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="py-6 text-sm text-gray-500">{text('empty')}</p>}
    </div>
  }

  return <section className="mb-8 space-y-6" aria-labelledby="engagement-insights-title">
    <div>
      <h2 id="engagement-insights-title" className="text-xl font-semibold text-[#003842] dark:text-[#42b8ac]">{text('title')}</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{text('consentNote')}</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text('sessionNote')}</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text('historyNote')}</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        ['views', report.totals.views], ['sessions', report.totals.sessions], ['unattributedViews', report.totals.unattributedViews],
      ].map(([key, value]) => <Card key={key}><p className="text-sm text-gray-500">{text(String(key))}</p><p className="mt-2 text-2xl font-bold text-[#003842] dark:text-white">{Number(value).toLocaleString(language)}</p></Card>)}
    </div>
    <Card><h3 className="text-lg font-semibold">{text('sourceBreakdown')}</h3>{activityTable(report.sources, text('sourceBreakdown'), true)}</Card>
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{text('accessPoints')}</h3>
        <label className="text-sm">{text('source')} <select value={source} onChange={event => setSource(event.target.value)} className="ml-2 rounded-lg border border-gray-300 bg-transparent p-2">
          {['all', 'website', 'qr', 'kiosk', 'direct', 'unknown'].map(key => <option key={key} value={key}>{text(key)}</option>)}
        </select></label>
      </div>
      {activityTable(points, text('accessPoints'), false, true)}
    </Card>
    <Card>
      <h3 className="text-lg font-semibold">{text('journey')}</h3>
      <p className="mt-1 text-sm text-gray-500">{text('journeyNote')}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(['opened', 'started', 'engaged'] as const).map(key => <div key={key} className="rounded-lg bg-[#42b8ac]/10 p-4">
          <p className="text-sm">{text(key)}</p><p className="my-2 text-2xl font-bold">{report.journey[key].toLocaleString(language)}</p>
          <p className="text-sm text-gray-500">{percent(report.journey[key], report.journey.opened)} {text('ofOpened')}</p>
          <div className="mt-2 h-2 overflow-hidden rounded bg-gray-200" aria-hidden="true"><div className="h-full bg-[#42b8ac]" style={{ width: report.journey.opened ? `${report.journey[key] / report.journey.opened * 100}%` : '0%' }} /></div>
        </div>)}
      </div>
    </Card>
    <Card>
      <h3 className="text-lg font-semibold">{text('noResults')}</h3>
      <p className="mt-1 text-sm text-gray-500">{text('noResultsNote')}</p>
      <div className="overflow-x-auto"><table className="mt-3 w-full text-left text-sm">
        <caption className="sr-only">{text('noResults')}</caption>
        <thead><tr className="border-b">{['query', 'searches', 'sessions', 'withFilters'].map(key => <th scope="col" key={key} className="px-2 py-3">{text(key)}</th>)}</tr></thead>
        <tbody>{report.noResults.map(row => <tr key={row.query} className="border-b border-gray-100 dark:border-gray-700"><th scope="row" className="max-w-xs break-words px-2 py-3 font-medium">{row.query}</th><td className="px-2">{row.searches}</td><td className="px-2">{row.sessions}</td><td className="px-2">{row.filtered}</td></tr>)}</tbody>
      </table></div>
      {!report.noResults.length && <p className="py-6 text-sm text-gray-500">{text('empty')}</p>}
    </Card>
    <Card>
      <h3 className="text-lg font-semibold">{text('busy')}</h3>
      <p className="mt-1 text-sm text-gray-500">{text('busyNote')} {report.timezone}</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full border-separate border-spacing-1 text-xs">
        <caption className="sr-only">{text('busy')} — {report.timezone}</caption>
        <thead><tr><th scope="col">{text('dayHour')}</th>{Array.from({ length: 24 }, (_, hour) => <th scope="col" key={hour} className="min-w-7">{String(hour).padStart(2, '0')}</th>)}</tr></thead>
        <tbody>{days.map((day, index) => <tr key={index}><th scope="row" className="pr-3 text-left">{day}</th>{Array.from({ length: 24 }, (_, hour) => {
          const count = report.busy.find(cell => cell.day === index && cell.hour === hour)?.sessions || 0
          return <td key={hour} className="h-8 rounded text-center tabular-nums" style={{ backgroundColor: `rgba(66,184,172,${count ? 0.15 + count / maxBusy * 0.6 : 0.04})` }} title={`${day} ${String(hour).padStart(2, '0')}:00 — ${count} ${text('sessions')}`}>{count || '·'}</td>
        })}</tr>)}</tbody>
      </table></div>
    </Card>
    <Card><h3 className="text-lg font-semibold">{text('locations')}</h3><p className="mt-1 text-sm text-gray-500">{text('locationNote')}</p>{activityTable(report.locations, text('locations'))}</Card>
  </section>
}
