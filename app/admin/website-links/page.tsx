'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/layout/Container'
import AccessPointNavigation from '@/components/admin/AccessPointNavigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Site = { id: string; name: string; business_id: string }
type WebsiteLink = { id: string; business_id: string; site_id: string; name: string; placement: string; site: { id: string; name: string } | null }

export default function WebsiteLinksPage() {
  const { t } = useTranslation()
  const [sites, setSites] = useState<Site[]>([])
  const [links, setLinks] = useState<WebsiteLink[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const [name, setName] = useState('')
  const [siteId, setSiteId] = useState('')
  const [placement, setPlacement] = useState('')
  const [origin, setOrigin] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'loadError' | 'copyError' | 'createError' | 'deleteError' | 'deleteForbidden' | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const removing = useRef(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setOrigin(window.location.origin)
    setLoading(true)
    setError(null)
    async function load() {
      try {
        const [sitesResponse, linksResponse] = await Promise.all([
          fetch('/api/sites', { signal: controller.signal }),
          fetch('/api/website-links', { signal: controller.signal }),
        ])
        if (!sitesResponse.ok || !linksResponse.ok) throw new Error('Unable to load website links')
        const [siteData, linkData] = await Promise.all([sitesResponse.json(), linksResponse.json()])
        if (!controller.signal.aborted) {
          setSites(siteData.sites || [])
          setLinks(linkData.links || [])
          setSiteId(current => current || siteData.sites?.[0]?.id || '')
        }
      } catch {
        if (!controller.signal.aborted) setError('loadError')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt])

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || !name.trim() || !siteId) return
    submitting.current = true
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/website-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), site_id: siteId, placement: placement.trim() }),
      })
      if (!response.ok) throw new Error('Unable to create website link')
      const data = await response.json()
      setLinks(current => [data.link, ...current])
      setName('')
      setPlacement('')
      setShowCreate(false)
    } catch {
      setError('createError')
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  async function removeLink(link: WebsiteLink) {
    if (removing.current || !window.confirm(t('websiteLinks.deleteConfirm', { name: link.name }))) return
    removing.current = true
    setRemovingId(link.id)
    setError(null)
    try {
      const response = await fetch(`/api/website-links/${link.id}`, { method: 'DELETE' })
      if (response.status === 403) {
        setError('deleteForbidden')
        return
      }
      // A previously removed link can safely be removed from this stale list too.
      if (!response.ok && response.status !== 404) throw new Error('Unable to remove website link')
      setLinks(current => current.filter(item => item.id !== link.id))
      setCopied(current => current === link.id ? null : current)
    } catch {
      setError('deleteError')
    } finally {
      removing.current = false
      setRemovingId(null)
    }
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t('websiteLinks.title')}</h2>
          <Button disabled={loading || error === 'loadError' || sites.length === 0 || saving}
            onClick={() => setShowCreate(current => !current)} aria-expanded={showCreate} aria-controls="create-website-link">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t(showCreate ? 'accessPoints.close' : 'websiteLinks.createLink')}
          </Button>
        </div>
        <p className="text-gray-600">{t('websiteLinks.description')}</p>
        {showCreate && (
          <form id="create-website-link" onSubmit={createLink} className="space-y-4 rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold">{t('websiteLinks.createLink')}</h3>
            <div>
              <label htmlFor="website-link-site" className="mb-1 block text-sm font-medium">{t('accessPoints.site')}</label>
              <select id="website-link-site" value={siteId} onChange={event => setSiteId(event.target.value)} required disabled={saving}
                className="w-full rounded border border-gray-300 p-2">
                <option value="">{t('accessPoints.chooseSite')}</option>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="website-link-name" className="mb-1 block text-sm font-medium">{t('accessPoints.name')}</label>
              <input id="website-link-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={saving}
                placeholder={t('websiteLinks.namePlaceholder')} className="w-full rounded border border-gray-300 p-2" />
            </div>
            <div>
              <label htmlFor="website-link-placement" className="mb-1 block text-sm font-medium">{t('accessPoints.placement')} {t('accessPoints.optional')}</label>
              <input id="website-link-placement" value={placement} onChange={event => setPlacement(event.target.value)} maxLength={200} disabled={saving}
                placeholder={t('websiteLinks.placementPlaceholder')} className="w-full rounded border border-gray-300 p-2" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving || !name.trim() || !siteId}>{t(saving ? 'accessPoints.creating' : 'accessPoints.create')}</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setShowCreate(false)}>{t('accessPoints.cancel')}</Button>
            </div>
          </form>
        )}
        {error && <div role="alert" className="text-red-700">
          <p>{t(`websiteLinks.${error}`)}</p>
          {error === 'loadError' && <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>{t('websiteLinks.retry')}</button>}
        </div>}
        {loading ? <p role="status">{t('websiteLinks.loading')}</p> : !error && links.length === 0 ? <p>{t(sites.length === 0 ? 'websiteLinks.empty' : 'websiteLinks.noLinks')}</p> : null}
        <div className="space-y-4">
          {links.map(link => {
            const params = new URLSearchParams({ site_id: link.site_id, mode: 'web', website_link: link.id })
            const url = `${origin}/kiosk/${encodeURIComponent(link.business_id)}?${params}`
            return (
              <section key={link.id} className="space-y-3 rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold">{link.name}</h3>
                <p className="text-sm text-gray-600">{link.site?.name}{link.placement ? ` · ${link.placement}` : ''}</p>
                <input aria-label={`${link.name} — ${t('websiteLinks.title')}`} readOnly value={url}
                  onFocus={event => event.currentTarget.select()} className="w-full rounded border border-gray-300 p-2 text-sm" />
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => copyLink(link.id, url)} className="rounded-lg bg-[#003842] px-4 py-2 text-sm text-white">
                    {t('accessPoints.copy')}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">{t('accessPoints.open')}</a>
                  <span role="status" className="text-sm">{copied === link.id ? t('accessPoints.copied') : ''}</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => removeLink(link)} disabled={removingId !== null}
                    aria-label={t('websiteLinks.deleteLabel', { name: link.name })}
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs text-gray-400 hover:text-red-600 disabled:cursor-wait disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(removingId === link.id ? 'websiteLinks.deleting' : 'accessPoints.delete')}
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </Container>
  )
}
