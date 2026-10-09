'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Copy, ExternalLink, Globe, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/layout/Card'
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

  const locationCount = new Set(links.map(link => link.site_id)).size

  return (
    <Container>
      <div className="space-y-6 py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('adminPortal.accessPoints')}</h1>
          <p className="mt-2 text-gray-600">{t('adminPortal.accessPointsDescription')}</p>
        </div>
        <AccessPointNavigation />
        {loading ? (
          <Card><div role="status" className="flex items-center justify-center gap-2 py-12 text-gray-600">
            <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />{t('websiteLinks.loading')}
          </div></Card>
        ) : (
          <>
            {error !== 'loadError' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card><p className="text-sm text-gray-500">{t('websiteLinks.title')}</p><p className="mt-1 text-2xl font-bold text-[#003842]">{links.length}</p></Card>
                <Card><p className="text-sm text-gray-500">{t('websiteLinks.linkedLocations')}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{locationCount}</p></Card>
              </div>
            )}

            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#003842]">{t('websiteLinks.title')}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t('websiteLinks.description')}</p>
                </div>
                <Button className="shrink-0" disabled={error === 'loadError' || sites.length === 0 || saving}
                  onClick={() => setShowCreate(true)} aria-expanded={showCreate} aria-controls="create-website-link">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />{t('websiteLinks.createLink')}
                </Button>
              </div>
            </Card>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{t(`websiteLinks.${error}`)}</p>
              {error === 'loadError' && <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>{t('websiteLinks.retry')}</button>}
            </div>}

            {showCreate && (
              <Card className="border-2 border-[#42b8ac]">
                <form id="create-website-link" onSubmit={createLink}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#003842]">{t('websiteLinks.createLink')}</h3>
                    <button type="button" aria-label={t('accessPoints.close')} disabled={saving} onClick={() => setShowCreate(false)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
                      <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label htmlFor="website-link-site" className="text-sm font-medium text-gray-700">
                      {t('accessPoints.site')}
                      <select id="website-link-site" value={siteId} onChange={event => setSiteId(event.target.value)} required disabled={saving}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                        <option value="">{t('accessPoints.chooseSite')}</option>
                        {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                      </select>
                    </label>
                    <label htmlFor="website-link-name" className="text-sm font-medium text-gray-700">
                      {t('accessPoints.name')}
                      <input id="website-link-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={saving}
                        placeholder={t('websiteLinks.namePlaceholder')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                    </label>
                    <label htmlFor="website-link-placement" className="text-sm font-medium text-gray-700">
                      {t('accessPoints.placement')} <span className="font-normal text-gray-400">{t('accessPoints.optional')}</span>
                      <input id="website-link-placement" value={placement} onChange={event => setPlacement(event.target.value)} maxLength={200} disabled={saving}
                        placeholder={t('websiteLinks.placementPlaceholder')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={saving} onClick={() => setShowCreate(false)}>{t('accessPoints.cancel')}</Button>
                    <Button type="submit" disabled={saving || !name.trim() || !siteId}>{t(saving ? 'accessPoints.creating' : 'accessPoints.create')}</Button>
                  </div>
                </form>
              </Card>
            )}

            {error !== 'loadError' && links.length === 0 ? (
              <Card className="py-12 text-center">
                <Globe className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">{t('websiteLinks.emptyTitle')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t(sites.length === 0 ? 'websiteLinks.empty' : 'websiteLinks.noLinks')}</p>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {links.map(link => {
                  const params = new URLSearchParams({ site_id: link.site_id, mode: 'web', website_link: link.id })
                  const url = `${origin}/kiosk/${encodeURIComponent(link.business_id)}?${params}`
                  return (
                    <Card key={link.id} className="flex min-w-0 flex-col">
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white sm:h-32 sm:w-32">
                          <Globe className="h-8 w-8 text-[#003842] sm:h-12 sm:w-12" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-semibold text-gray-900">{link.name}</h3>
                          <p className="break-words text-xs text-gray-500">{link.site?.name}{link.placement ? ` · ${link.placement}` : ''}</p>
                          <p className="mt-3 select-all break-all text-xs text-gray-500">{url}</p>
                        </div>
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyLink(link.id, url)}>
                            {copied === link.id ? <Check className="mr-1 h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="mr-1 h-4 w-4" aria-hidden="true" />}
                            {t(copied === link.id ? 'accessPoints.copied' : 'accessPoints.copy')}
                          </Button>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" />{t('accessPoints.open')}
                          </a>
                        </div>
                        <span role="status" className="sr-only">{copied === link.id ? t('accessPoints.copied') : ''}</span>
                        <div className="mt-3 flex justify-end">
                          <button type="button" onClick={() => removeLink(link)} disabled={removingId !== null}
                            aria-label={t('websiteLinks.deleteLabel', { name: link.name })}
                            className="inline-flex min-h-[44px] items-center gap-1 text-xs text-gray-400 hover:text-red-600 disabled:cursor-wait disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {t(removingId === link.id ? 'websiteLinks.deleting' : 'accessPoints.delete')}
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}
