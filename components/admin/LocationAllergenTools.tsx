'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { isAllergenAssessmentComplete } from '@/lib/allergen-assessment'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'
import { downloadLocationGuide, fetchLocationGuide } from '@/lib/location-guide-client'
import { JURISDICTIONS, KIOSK_BACKUP, locationAllergenGuidance, locationGuidePath, publishedDate, type Jurisdiction } from '@/lib/location-jurisdiction'
import { specificAllergens } from '@/lib/ppds'
import { getAllergenLevelText } from '@/types/allergen'
import { PpdsLabelEditor } from '@/components/admin/PpdsLabelEditor'

interface Review {
  canApprove: boolean
  fingerprint: string | null
  items: MenuItem[]
  incomplete: string[]
  publication: { id: string; publishedAt: string } | null
  unpublishedChanges: boolean
}

const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-[#003842] px-4 py-2 text-sm font-semibold text-[#003842] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
const fieldClass = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900'

export function LocationAllergenTools({ siteId, siteSlug, siteName, businessSlug, jurisdiction }: {
  siteId: string; siteSlug: string; siteName: string; businessSlug: string; jurisdiction: Jurisdiction
}) {
  const endpoint = `/api/sites/${encodeURIComponent(siteSlug)}/allergens`
  const path = locationGuidePath(businessSlug, siteId, 'web')
  const guidance = locationAllergenGuidance(jurisdiction)
  const qr = useRef<HTMLCanvasElement>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [signLocation, setSignLocation] = useState('')
  const [publishedItems, setPublishedItems] = useState<MenuItem[]>([])
  const [deliveryItem, setDeliveryItem] = useState('')
  const [orderReference, setOrderReference] = useState('')
  const [orderChecked, setOrderChecked] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { cache: 'no-store', signal })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not review this menu.')
    const published = data.publication ? (await fetchLocationGuide(businessSlug, siteId)).menuItems : []
    if (!signal?.aborted) {
      setReview(data)
      setReviewed(false)
      setPublishedItems(published)
    }
  }, [endpoint, businessSlug, siteId])

  useEffect(() => {
    const request = new AbortController()
    setUrl(new URL(path, window.location.origin).href)
    void load(request.signal).catch(err => {
      if (!request.signal.aborted) setError(err.message)
    })
    return () => request.abort()
  }, [load, path])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!review?.fingerprint || !reviewed) return
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: review.fingerprint, reviewed }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    const changed = result.id !== review.publication?.id
    await load()
    setMessage(changed ? 'Guide published. Print the new guide and replace copies on display.' : 'This guide is already current.')
  }

  async function printSign() {
    if (!qr.current || !signLocation.trim()) return
    const { downloadAllergenSign } = await import('@/lib/pdf/location-allergens')
    downloadAllergenSign({ site: siteName, jurisdiction, displayLocation: signLocation.trim(), url, qr: qr.current })
  }

  async function printSlip() {
    const current = await fetchLocationGuide(businessSlug, siteId)
    const location = current.business.location
    if (!location?.publishedAt || location.publicationId !== review?.publication?.id) {
      await load()
      setOrderChecked(false)
      throw new Error('The published guide changed. Check the item against the current guide before printing.')
    }
    const item = current.menuItems.find(item => item.id === deliveryItem)
    if (!item?.allergen_warnings || !isAllergenAssessmentComplete(item.allergen_warnings)) {
      throw new Error('The selected item has no complete published allergen assessment.')
    }
    const { downloadDeliverySlip } = await import('@/lib/pdf/location-allergens')
    downloadDeliverySlip({
      site: location.name, item: item.name, warnings: item.allergen_warnings,
      publishedAt: location.publishedAt, orderReference: orderReference.trim(),
    })
  }

  const selectedDelivery = publishedItems.find(item => item.id === deliveryItem)

  return (
    <div className="space-y-6 text-gray-900">
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-bold">Location allergen guide</h3>
        <p className="font-medium">{JURISDICTIONS[jurisdiction]}</p>
        <p className="text-sm">{guidance.onSite} {KIOSK_BACKUP}</p>
        <a className="inline-flex text-sm font-semibold underline" href={guidance.href}>{guidance.regulator} guidance</a>
        {review && (
          <>
            <p className="text-sm">{review.publication
              ? `Published ${publishedDate(review.publication.publishedAt)}`
              : jurisdiction === 'IE' ? 'This Irish location uses the existing live guide until you publish a reviewed version.'
              : 'Publish a reviewed version to make this location’s guide available.'}</p>
            {review.unpublishedChanges && <p className="text-sm font-semibold text-amber-900">Menu changes are waiting for review. Replace printed copies after publishing.</p>}
            {review.incomplete.length > 0 && <p className="text-sm text-amber-900">Complete the assessment for {review.incomplete.join(', ')} before publishing.</p>}
            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer font-semibold">Review current menu ({review.items.length})</summary>
              {review.items.length === 0 && <p className="mt-2 text-sm">There are no active menu items for this location.</p>}
              <ul className="mt-2 divide-y divide-gray-200">
                {review.items.map(item => (
                  <li key={item.id} className="py-2 text-sm">
                    <p className="font-semibold">{item.name}</p>
                    <p>{item.allergen_warnings && isAllergenAssessmentComplete(item.allergen_warnings)
                      ? specificAllergens(item.allergen_warnings).map(allergen => getAllergenLevelText(allergen.level, allergen.name)).join('. ') || 'No declarable allergens identified'
                      : 'Assessment incomplete'}</p>
                  </li>
                ))}
              </ul>
            </details>
            {review.canApprove && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />
                I reviewed the menu items and confirmed the allergen information for this location.
              </label>
            )}
            <div className="flex flex-wrap gap-3">
              {review.canApprove && <button type="button" className={actionClass} disabled={busy || !reviewed || !review.fingerprint || review.incomplete.length > 0}
                onClick={() => void run(publish)}>Publish reviewed guide</button>}
              <button type="button" className={actionClass} disabled={busy} onClick={() => void run(() => load())}>Refresh menu</button>
              <button type="button" className={actionClass} disabled={busy || (!review.publication && jurisdiction !== 'IE')}
                onClick={() => void run(() => downloadLocationGuide(businessSlug, siteId))}>Download printable guide</button>
            </div>
          </>
        )}
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <label htmlFor="location-guide-link" className="block text-sm font-semibold">Shareable link for QR, online and phone orders</label>
          <div className="flex flex-wrap gap-2">
            <input id="location-guide-link" className={`${fieldClass} flex-1`} value={url} readOnly onFocus={event => event.currentTarget.select()} />
            <button type="button" className={actionClass} disabled={!url || busy} onClick={() => void run(async () => {
              await navigator.clipboard.writeText(url)
              setMessage('Location link copied.')
            })}>Copy link</button>
            <a href={path} target="_blank" rel="noreferrer" className={actionClass}>Open guide</a>
          </div>
          <p className="text-sm">Share the link before the customer buys. Provide item-specific allergen information again at delivery.</p>
        </div>
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <label htmlFor="allergen-sign-location" className="block text-sm font-semibold">Where can customers find the written guide?</label>
          <input id="allergen-sign-location" className={fieldClass} value={signLocation} onChange={event => setSignLocation(event.target.value)}
            maxLength={100} placeholder="For example, on the counter beside the menu" />
          {url && <QRCodeCanvas className="hidden" ref={qr} value={url} size={360} marginSize={4} level="M" />}
          <button type="button" className={actionClass} disabled={!url || !signLocation.trim() || busy || (jurisdiction !== 'IE' && !review?.publication)}
            onClick={() => void run(printSign)}>Download sign</button>
        </div>
        {error && <p className="text-sm font-medium text-red-800" role="alert">{error}</p>}
        {message && <p className="text-sm font-medium text-teal-800" role="status">{message}</p>}
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-bold">Delivery allergen slip</h3>
        <p className="text-sm">Print a separate slip for each distinct item and match it to the container at packing.</p>
        {!review?.publication ? <p className="text-sm">Publish the location guide before printing delivery allergen slips.</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">Published menu item
                <select className={fieldClass} value={deliveryItem} onChange={event => {
                  setDeliveryItem(event.target.value)
                  setOrderChecked(false)
                }}>
                  <option value="">Choose an item</option>
                  {publishedItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium">Order reference (optional)
                <input className={fieldClass} maxLength={40} value={orderReference} onChange={event => setOrderReference(event.target.value)} />
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={orderChecked} onChange={event => setOrderChecked(event.target.checked)} />
              I matched this published recipe to the actual order and checked any substitutions.
            </label>
            <button type="button" className={actionClass} disabled={!selectedDelivery || !orderChecked || busy}
              onClick={() => void run(printSlip)}>Download delivery slip</button>
          </>
        )}
      </section>

      {jurisdiction !== 'IE' && review && (
        <PpdsLabelEditor siteSlug={siteSlug} jurisdiction={jurisdiction} items={review.items} canApprove={review.canApprove} />
      )}
    </div>
  )
}
