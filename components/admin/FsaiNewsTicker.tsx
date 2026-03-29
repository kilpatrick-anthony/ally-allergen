'use client'
// components/admin/FsaiNewsTicker.tsx
// Scrolling food-safety news ticker sourced from FSAI / EU RASFF RSS feeds.
// Sits at the top of the admin content area on every page.

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, Rss } from 'lucide-react'
import type { AlertItem } from '@/app/api/fsai-alerts/route'

const POLL_INTERVAL = 10 * 60 * 1000 // re-fetch every 10 minutes

function SourceBadge({ source }: { source: AlertItem['source'] }) {
  if (source === 'IE') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-700 text-white shrink-0">
        IE
      </span>
    )
  }
  if (source === 'EU') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-700 text-white shrink-0">
        EU
      </span>
    )
  }
  if (source === 'FSN') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white shrink-0">
        FSN
      </span>
    )
  }
  if (source === 'FSAI') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
        FSAI
      </span>
    )
  }
  return null
}

export function FsaiNewsTicker() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation | null>(null)

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/fsai-alerts')
      if (!res.ok) throw new Error('non-ok')
      const data = await res.json()
      setAlerts(data.alerts || [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch + polling
  useEffect(() => {
    fetchAlerts()
    const timer = setInterval(fetchAlerts, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // CSS-based marquee animation via Web Animations API
  useEffect(() => {
    const el = scrollRef.current
    if (!el || alerts.length === 0) return

    // Wait one paint for the element to measure
    const frame = requestAnimationFrame(() => {
      const contentWidth = el.scrollWidth
      const containerWidth = el.parentElement?.clientWidth ?? 0
      const distance = contentWidth + containerWidth
      const duration = Math.max(distance * 30, 15000) // ~30ms per px, min 15s

      animRef.current?.cancel()
      animRef.current = el.animate(
        [
          { transform: `translateX(${containerWidth}px)` },
          { transform: `translateX(-${contentWidth}px)` },
        ],
        {
          duration,
          iterations: Infinity,
          easing: 'linear',
        }
      )
    })

    return () => {
      cancelAnimationFrame(frame)
      animRef.current?.cancel()
    }
  }, [alerts])

  if (dismissed) return null

  return (
    <div
      className="relative flex items-center bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800 h-8 overflow-hidden select-none"
      aria-label="Food safety news ticker"
    >
      {/* Static left label */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 bg-amber-100 dark:bg-amber-900/60 border-r border-amber-200 dark:border-amber-700 h-full z-10">
        <Rss className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap uppercase tracking-wide">
          Food Safety
        </span>
      </div>

      {/* Scrolling content */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center gap-2 px-4 text-xs text-amber-600 dark:text-amber-400 h-8">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Loading latest alerts…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 text-xs text-amber-600 dark:text-amber-400 h-8">
            <AlertTriangle className="h-3 w-3" />
            Unable to load feed — visit{' '}
            <a
              href="https://www.fsai.ie/industry/food-safety-alerts.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-800"
            >
              FSAI.ie
            </a>{' '}
            for the latest alerts.
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex items-center gap-8 whitespace-nowrap will-change-transform h-8"
            style={{ width: 'max-content' }}
          >
            {alerts.map(alert => (
              <span key={alert.id} className="inline-flex items-center gap-2">
                <SourceBadge source={alert.source} />
                {alert.link ? (
                  <a
                    href={alert.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-white hover:underline inline-flex items-center gap-1"
                  >
                    {alert.title}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                  </a>
                ) : (
                  <span className="text-xs text-amber-800 dark:text-amber-200">
                    {alert.title}
                  </span>
                )}
                <span className="text-amber-300 dark:text-amber-600 text-base leading-none">•</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss news ticker"
        className="shrink-0 px-2 h-full flex items-center text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 transition-colors border-l border-amber-200 dark:border-amber-700"
      >
        <span className="text-xs leading-none">&times;</span>
      </button>
    </div>
  )
}
