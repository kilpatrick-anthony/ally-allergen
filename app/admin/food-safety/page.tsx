'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, Rss } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { AlertItem } from '@/app/api/fsai-alerts/route'

function SourceBadge({ source }: { source: AlertItem['source'] }) {
  const styles: Record<string, string> = {
    IE: 'bg-green-700 text-white',
    EU: 'bg-blue-700 text-white',
    FSN: 'bg-green-600 text-white',
    FSAI: 'bg-amber-500 text-white',
  }
  const style = styles[source]
  if (!style) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold shrink-0 ${style}`}>
      {source}
    </span>
  )
}

export default function FoodSafetyPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filter, setFilter] = useState<string>('all')

  async function fetchAlerts(force = false) {
    setRefreshing(true)
    setError(false)
    try {
      const url = force ? '/api/fsai-alerts?force=1' : '/api/fsai-alerts'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAlerts(data.alerts ?? [])
      setLastUpdated(new Date())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.source === filter)

  const sources: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Sources' },
    { value: 'FSAI', label: 'FSAI (Ireland)' },
    { value: 'IE', label: 'IE (Ireland)' },
    { value: 'EU', label: 'EU RASFF' },
    { value: 'FSN', label: 'Food Safety News' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Food Safety Alerts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Live feed from FSAI, EU RASFF, and Food Safety News
              {lastUpdated && (
                <> · Last updated {lastUpdated.toLocaleTimeString()}</>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchAlerts(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Source filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sources.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === s.value
                ? 'bg-[#003842] text-white border-[#003842]'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to load food safety alerts.</p>
          <button
            type="button"
            onClick={() => fetchAlerts(true)}
            className="px-4 py-2 rounded-lg bg-[#003842] text-white text-sm font-medium hover:bg-[#004a57] transition-colors"
          >
            Try again
          </button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Rss className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No alerts found for this source.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3">
                <SourceBadge source={alert.source} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                      {alert.title}
                    </h3>
                    {alert.link && (
                      <a
                        href={alert.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-gray-400 hover:text-[#42b8ac] transition-colors"
                        aria-label="Open alert"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  {alert.date && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(alert.date).toLocaleDateString('en-IE', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
