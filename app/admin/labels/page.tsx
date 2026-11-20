'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin, Tag } from 'lucide-react'

type Location = {
  id: string
  name: string
  slug: string
  city: string | null
  country: string | null
  jurisdiction: string | null
  is_active: boolean
}

export default function LabelCreatorPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLocations = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/sites', { cache: 'no-store', signal })
      const data = await response.json() as { sites?: Location[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not load locations.')
      if (!Array.isArray(data.sites)) throw new Error('The location list could not be read.')
      if (!signal?.aborted) setLocations(data.sites)
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load locations.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const request = new AbortController()
    void loadLocations(request.signal)
    return () => request.abort()
  }, [loadLocations])

  const activeLocations = useMemo(() => locations.filter(location => location.is_active), [locations])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-3 text-[#003842]">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Label Creator</h1>
            <p className="text-sm text-gray-600">Choose a location to create or review its ingredient labels.</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-700">
          Ingredient labels are optional and should be checked against the complete product and local requirements before use.
        </p>
      </header>

      {loading ? (
        <p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-700">Loading locations…</p>
      ) : error ? (
        <div className="space-y-3 rounded-xl border border-red-200 bg-white p-5">
          <p role="alert" className="text-sm text-red-800">{error}</p>
          <button type="button" onClick={() => void loadLocations()} className="rounded-lg border border-[#003842] px-4 py-2 text-sm font-semibold text-[#003842]">
            Retry
          </button>
        </div>
      ) : activeLocations.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700">There are no active locations to create labels for.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {activeLocations.map(location => (
            <li key={location.id}>
              <Link
                href={`/admin/sites/${encodeURIComponent(location.slug)}?tab=allergens`}
                className="flex min-h-16 items-center justify-between gap-4 p-4 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#003842]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-[#42b8ac]" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900">{location.name}</span>
                    <span className="block truncate text-sm text-gray-600">
                      {[location.city, location.country, location.jurisdiction].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-[#003842]">Open label creator →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
