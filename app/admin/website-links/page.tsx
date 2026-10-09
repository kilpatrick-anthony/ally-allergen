'use client'

import { useEffect, useState } from 'react'
import { Container } from '@/components/layout/Container'
import AccessPointNavigation from '@/components/admin/AccessPointNavigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Site = { id: string; name: string; business_id: string }

export default function WebsiteLinksPage() {
  const { t } = useTranslation()
  const [sites, setSites] = useState<Site[]>([])
  const [origin, setOrigin] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'loadError' | 'copyError' | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setOrigin(window.location.origin)
    setLoading(true)
    setError(null)
    async function load() {
      try {
        const response = await fetch('/api/sites', { signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load locations')
        const data = await response.json()
        if (!controller.signal.aborted) setSites(data.sites || [])
      } catch {
        if (!controller.signal.aborted) setError('loadError')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt])

  async function copyLink(id: string, url: string) {
    setError(null)
    setCopied(null)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
    } catch {
      setError('copyError')
    }
  }

  return (
    <Container>
      <div className="space-y-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('adminPortal.accessPoints')}</h1>
        <AccessPointNavigation />
        <h2 className="text-xl font-semibold">{t('websiteLinks.title')}</h2>
        <p className="text-gray-600">{t('websiteLinks.description')}</p>
        {error && <div role="alert" className="text-red-700">
          <p>{t(`websiteLinks.${error}`)}</p>
          {error === 'loadError' && <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>{t('websiteLinks.retry')}</button>}
        </div>}
        {loading ? <p role="status">{t('websiteLinks.loading')}</p> : !error && sites.length === 0 ? <p>{t('websiteLinks.empty')}</p> : null}
        <div className="space-y-4">
          {sites.map(site => {
            const params = new URLSearchParams({ site_id: site.id, mode: 'web' })
            const url = `${origin}/kiosk/${encodeURIComponent(site.business_id)}?${params}`
            return (
              <section key={site.id} className="space-y-3 rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold">{site.name}</h3>
                <input aria-label={`${site.name} — ${t('websiteLinks.title')}`} readOnly value={url}
                  onFocus={event => event.currentTarget.select()} className="w-full rounded border border-gray-300 p-2 text-sm" />
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => copyLink(site.id, url)} className="rounded-lg bg-[#003842] px-4 py-2 text-sm text-white">
                    {t('accessPoints.copy')}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">{t('accessPoints.open')}</a>
                  <span role="status" className="text-sm">{copied === site.id ? t('accessPoints.copied') : ''}</span>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </Container>
  )
}
