'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Copy, Download, RefreshCw, Search } from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import {
  platformCsv,
  platformSummary,
  type PlatformInsights,
  type RankedTerm,
} from '@/lib/analytics/platform-insights'

const number = (value: number) => value.toLocaleString('en-IE')
const dateLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Dublin',
  })

export default function PlatformInsightsPage() {
  const [preset, setPreset] = useState('last_week')
  const [start, setStart] = useState(''),
    [end, setEnd] = useState('')
  const [includeDemo, setIncludeDemo] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [report, setReport] = useState<PlatformInsights | null>(null)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [feedback, setFeedback] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setReport(null)
    setError('')
    setFeedback('')
    if (preset === 'custom' && (!start || !end)) {
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    const params = new URLSearchParams({ range: preset, include_demo: String(includeDemo) })
    if (preset === 'custom') {
      params.set('start', start)
      params.set('end', end)
    }
    fetch(`/api/super-admin/insights?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load insights.')
        if (!controller.signal.aborted) setReport(data)
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Could not load insights.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [preset, start, end, includeDemo, refresh])

  async function copySummary() {
    if (!report) return
    try {
      await navigator.clipboard.writeText(platformSummary(report))
      setFeedback('Weekly summary copied. You can edit it before posting.')
    } catch {
      setFeedback('Could not copy. You can select the summary below or export the CSV instead.')
    }
  }
  function exportCsv() {
    if (!report) return
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', platformCsv(report)], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `allyjen-search-insights-${report.range.start}-${report.range.end}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const maxDaily = Math.max(1, ...(report?.daily.map((day) => day.searches) || []))
  const ranking = (title: string, rows: RankedTerm[], filters = false) => (
    <Card>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {filters
          ? 'Actual filter selections. A search may use several filters.'
          : 'Top 20 typed search terms across businesses; case and extra spaces are ignored.'}
      </p>
      {!rows.length ? (
        <p className="mt-5 text-sm text-gray-500">No recorded activity in this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="p-2">
                  Rank / term
                </th>
                <th scope="col" className="p-2">
                  {filters ? 'Selections' : 'Searches'}
                </th>
                <th scope="col" className="p-2">
                  Previous period
                </th>
                <th scope="col" className="p-2">
                  Change
                </th>
                <th scope="col" className="p-2">
                  Businesses
                </th>
                {!filters && (
                  <th scope="col" className="p-2">
                    Share
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.term} className="border-b border-gray-100 dark:border-gray-800">
                  <th scope="row" className="max-w-xs break-words p-2 text-left font-medium">
                    {i + 1}. {row.term}
                  </th>
                  <td className="p-2 tabular-nums">{number(row.count)}</td>
                  <td className="p-2 tabular-nums">{number(row.previousCount)}</td>
                  <td className="whitespace-nowrap p-2">
                    {row.changePercent === null
                      ? 'New'
                      : `${row.changePercent > 0 ? '+' : ''}${row.changePercent}%`}
                  </td>
                  <td className="p-2">{number(row.businesses)}</td>
                  {!filters && <td className="p-2">{row.share}%</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )

  return (
    <div data-no-translate className="space-y-6 text-gray-900 dark:text-gray-100">
      <header>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 shrink-0 text-teal-700" />
          <h1 className="text-3xl font-bold">Platform search insights</h1>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Collective search activity across AllyJen businesses, ready for your weekly updates.
        </p>
      </header>
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
            Reporting period
            <select
              aria-label="Reporting period"
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
              className="rounded-lg border bg-white p-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="last_week">Last complete week (Mon–Sun)</option>
              <option value="7d">Last 7 complete days</option>
              <option value="30d">Last 30 complete days</option>
              <option value="custom">Custom dates</option>
            </select>
          </label>
          {preset === 'custom' && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                From
                <input
                  aria-label="From"
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="rounded-lg border bg-transparent p-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                To
                <input
                  aria-label="To"
                  type="date"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="rounded-lg border bg-transparent p-2"
                />
              </label>
            </>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(event) => setIncludeDemo(event.target.checked)}
            />
            Include demo businesses
          </label>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Dates use Europe/Dublin. Demo accounts are excluded by default because they contain seeded sample
          activity.
        </p>
      </Card>
      {loading && (
        <p role="status" className="py-8 text-center">
          Loading platform insights…
        </p>
      )}
      {error && (
        <Card>
          <div role="alert">
            <p>{error}</p>
            <Button className="mt-3" onClick={() => setRefresh((value) => value + 1)}>
              Try again
            </Button>
          </div>
        </Card>
      )}
      {!loading && !error && !report && <p role="status">Choose a start and end date to load your report.</p>}
      {report && (
        <>
          <div>
            <p className="font-semibold">
              {dateLabel(report.range.start)} – {dateLabel(report.range.end)}
            </p>
            <p className="text-sm text-gray-500">
              Compared with {dateLabel(report.range.previousStart)} – {dateLabel(report.range.previousEnd)}.{' '}
              {report.range.partial ? 'Today is still in progress.' : 'Complete calendar days.'}{' '}
              {report.includeDemo ? 'Includes demo activity.' : 'Demo activity excluded.'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Recorded searches', report.overview.searches],
              ['Recorded sessions', report.overview.sessions],
              ['Page views', report.overview.views],
              ['Businesses with activity', report.overview.businesses],
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-teal-800 dark:text-teal-300">
                  {number(Number(value))}
                </p>
              </Card>
            ))}
          </div>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Weekly post summary</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Top five typed terms and counts for the selected period. Review the wording before posting.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={Copy} onClick={copySummary} disabled={!report.topSearches.length}>
                  Copy summary
                </Button>
                <Button variant="outline" icon={Download} onClick={exportCsv}>
                  Export CSV
                </Button>
              </div>
            </div>
            <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
              {report.topSearches.length ? platformSummary(report) : 'No recorded searches in this period.'}
            </pre>
            {feedback && (
              <p role="status" className="mt-3 text-sm">
                {feedback}
              </p>
            )}
          </Card>
          {ranking('Most searched terms', report.topSearches)}
          <Card>
            <h2 className="text-xl font-semibold">Searches by day</h2>
            <p className="mt-1 text-sm text-gray-500">Recorded searches by calendar day in Irish time.</p>
            <div
              className="mt-4 max-h-96 space-y-2 overflow-y-auto"
              role="list"
              aria-label="Daily search counts"
            >
              {report.daily.map((day) => (
                <div
                  key={day.day}
                  role="listitem"
                  className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm"
                >
                  <span>
                    {new Date(`${day.day}T12:00:00Z`).toLocaleDateString('en-IE', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'Europe/Dublin',
                    })}
                  </span>
                  <div className="h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded bg-teal-600"
                      style={{ width: `${(day.searches / maxDaily) * 100}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums" title={`Previous: ${day.previousSearches}`}>
                    {number(day.searches)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
            {ranking('Most selected allergen filters', report.topAllergens, true)}
            {ranking('Most selected dietary filters', report.topDietary, true)}
          </div>
          <Card>
            <h2 className="text-xl font-semibold">Searches with no results</h2>
            <p className="mt-1 text-sm text-gray-500">
              {number(report.overview.noResultSearches)} searches returned no matches. Filters may have
              affected results. Older events without result counts are excluded.
            </p>
            {report.noResults.length ? (
              <ul className="mt-4 divide-y dark:divide-gray-700">
                {report.noResults.map((row) => (
                  <li key={row.term} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span className="break-all">{row.term}</span>
                    <span>
                      {number(row.count)} searches · {number(row.filtered)} with filters active
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No recorded zero-result searches in this period.</p>
            )}
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Where activity comes from</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="p-2">
                      Access type
                    </th>
                    <th scope="col" className="p-2">
                      Searches
                    </th>
                    <th scope="col" className="p-2">
                      Views
                    </th>
                    <th scope="col" className="p-2">
                      Sessions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.sources.map((row) => (
                    <tr key={row.source} className="border-t dark:border-gray-700">
                      <th scope="row" className="p-2 font-medium">
                        {{
                          qr: 'QR codes',
                          website: 'Website links',
                          kiosk: 'Kiosks',
                          direct: 'Direct links',
                          unknown: 'Unattributed / legacy',
                        }[row.source] || row.source}
                      </th>
                      <td className="p-2">{number(row.searches)}</td>
                      <td className="p-2">{number(row.views)}</td>
                      <td className="p-2">{number(row.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-xs text-gray-500">
            Based on recorded analytics only, including consent choices. Searches are interactions, not unique
            people or sales. Legacy events may lack session or source data. Generated{' '}
            {new Date(report.generatedAt).toLocaleString('en-IE', { timeZone: report.range.timezone })} (
            {report.range.timezone}).
          </p>
        </>
      )}
    </div>
  )
}
