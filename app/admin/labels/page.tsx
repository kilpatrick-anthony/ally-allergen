'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tag } from 'lucide-react'
import { PpdsLabelEditor } from '@/components/admin/PpdsLabelEditor'
import { isJurisdiction } from '@/lib/location-jurisdiction'

type Location = {
  id: string
  name: string
  slug: string
  city: string | null
  country: string | null
  jurisdiction: string | null
  is_active: boolean
}

type MenuItem = {
  id: string
  name: string
  site_id: string | null
  ingredients: string[]
  status: string
}

export default function LabelCreatorPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [locationError, setLocationError] = useState('')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loadingMenuItems, setLoadingMenuItems] = useState(false)
  const [menuItemsError, setMenuItemsError] = useState('')
  const [requestedItemId, setRequestedItemId] = useState('')
  const [requestedIngredientId, setRequestedIngredientId] = useState('')
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [menuLabelType, setMenuLabelType] = useState<'loose' | 'ppds' | null>(null)

  const loadLocations = useCallback(async (signal?: AbortSignal) => {
    setLoadingLocations(true)
    setLocationError('')
    try {
      const response = await fetch('/api/sites', { cache: 'no-store', signal })
      const data = await response.json() as { sites?: Location[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not load locations.')
      if (!Array.isArray(data.sites)) throw new Error('The location list could not be read.')
      if (!signal?.aborted) setLocations(data.sites)
    } catch (error) {
      if (!signal?.aborted) setLocationError(error instanceof Error ? error.message : 'Could not load locations.')
    } finally {
      if (!signal?.aborted) setLoadingLocations(false)
    }
  }, [])

  useEffect(() => {
    const request = new AbortController()
    void loadLocations(request.signal)
    return () => request.abort()
  }, [loadLocations])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const itemId = params.get('item') || ''
    const ingredientId = itemId ? '' : params.get('ingredient') || ''
    setRequestedItemId(itemId)
    setRequestedIngredientId(ingredientId)
    setSelectedMenuItemId(itemId)
  }, [])

  useEffect(() => {
    if (!requestedItemId && !requestedIngredientId) return
    const request = new AbortController()
    const loadMenuItems = async () => {
      setLoadingMenuItems(true)
      setMenuItemsError('')
      try {
        const filter = requestedItemId
          ? `item_id=${encodeURIComponent(requestedItemId)}`
          : `ingredient_id=${encodeURIComponent(requestedIngredientId)}`
        const response = await fetch(`/api/menu-items?${filter}`, { cache: 'no-store', signal: request.signal })
        const data = await response.json() as { menuItems?: MenuItem[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'Could not load menu items.')
        if (!Array.isArray(data.menuItems)) throw new Error('The menu item list could not be read.')
        if (!request.signal.aborted) setMenuItems(data.menuItems.filter(item => item.status === 'active'))
      } catch (error) {
        if (!request.signal.aborted) setMenuItemsError(error instanceof Error ? error.message : 'Could not load menu items.')
      } finally {
        if (!request.signal.aborted) setLoadingMenuItems(false)
      }
    }

    void loadMenuItems()
    return () => request.abort()
  }, [requestedItemId, requestedIngredientId])

  const activeLocations = useMemo(() => locations.filter(location => location.is_active), [locations])
  const candidateMenuItems = useMemo(() => menuItems.filter(item =>
    requestedItemId
      ? item.id === requestedItemId
      : item.ingredients.includes(requestedIngredientId)
  ), [menuItems, requestedItemId, requestedIngredientId])
  const selectedMenuItem = candidateMenuItems.find(item => item.id === selectedMenuItemId) || null
  const labelType = requestedIngredientId ? 'loose' : menuLabelType
  const eligibleLocations = selectedMenuItem
    ? activeLocations.filter(location =>
      (!selectedMenuItem.site_id || selectedMenuItem.site_id === location.id) &&
      (labelType !== 'ppds' || (isJurisdiction(location.jurisdiction) && location.jurisdiction !== 'IE')))
    : []
  const selectedLocation = eligibleLocations.find(location => location.id === selectedLocationId) || null
  const selectedJurisdiction = selectedLocation && isJurisdiction(selectedLocation.jurisdiction)
    ? selectedLocation.jurisdiction
    : null
  const hasItemTarget = Boolean(requestedItemId || requestedIngredientId)

  useEffect(() => {
    if (requestedItemId) {
      setSelectedMenuItemId(requestedItemId)
    } else if (requestedIngredientId && !candidateMenuItems.some(item => item.id === selectedMenuItemId)) {
      setSelectedMenuItemId(candidateMenuItems[0]?.id || '')
    }
  }, [requestedItemId, requestedIngredientId, selectedMenuItemId, candidateMenuItems])

  useEffect(() => {
    if (!eligibleLocations.some(location => location.id === selectedLocationId)) {
      setSelectedLocationId(eligibleLocations[0]?.id || '')
    }
  }, [eligibleLocations, selectedLocationId])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-3 text-[#003842]">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create or print a label</h1>
            <p className="text-sm text-gray-600">Labels are opened from an ingredient or menu item.</p>
          </div>
        </div>
      </header>

      {!hasItemTarget ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700">
          Open the label action from an ingredient or menu item to create or print its label.
        </p>
      ) : loadingLocations ? (
        <p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-700">Loading locations…</p>
      ) : locationError ? (
        <div className="space-y-3 rounded-xl border border-red-200 bg-white p-5">
          <p role="alert" className="text-sm text-red-800">{locationError}</p>
          <button type="button" onClick={() => void loadLocations()} className="rounded-lg border border-[#003842] px-4 py-2 text-sm font-semibold text-[#003842]">
            Retry
          </button>
        </div>
      ) : activeLocations.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700">There are no active locations to create labels for.</p>
      ) : loadingMenuItems ? (
        <p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-700">Loading menu items…</p>
      ) : menuItemsError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800">{menuItemsError}</p>
      ) : requestedIngredientId && candidateMenuItems.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700">
          No active menu items currently use this ingredient. Add it to a menu item recipe before creating its product label.
        </p>
      ) : requestedItemId && !selectedMenuItem ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700">This menu item was not found or is not active.</p>
      ) : (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          {requestedIngredientId && (
            <label className="block space-y-1 text-sm font-semibold text-gray-900">
              Menu item using this ingredient
              <select
                className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={selectedMenuItemId}
                onChange={event => setSelectedMenuItemId(event.target.value)}
              >
                {candidateMenuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          {requestedItemId && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-900">Choose a label for {selectedMenuItem?.name}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-300 p-4 has-[:checked]:border-[#003842] has-[:checked]:bg-teal-50">
                  <input className="mt-1 accent-[#003842]" type="radio" name="label-type" checked={labelType === 'loose'}
                    onChange={() => setMenuLabelType('loose')} />
                  <span className="space-y-1 text-sm">
                    <span className="block font-semibold">Allergen label</span>
                    <span className="block text-gray-700">For loose or made-to-order food. Add an ingredients list or notes if needed.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-300 p-4 has-[:checked]:border-[#003842] has-[:checked]:bg-teal-50">
                  <input className="mt-1 accent-[#003842]" type="radio" name="label-type" checked={labelType === 'ppds'}
                    onChange={() => setMenuLabelType('ppds')} />
                  <span className="space-y-1 text-sm">
                    <span className="block font-semibold">UK PPDS label</span>
                    <span className="block text-gray-700">For food prepacked for direct sale. Check how the item is sold before creating an on-pack label.</span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}
          {labelType && (eligibleLocations.length === 0 ? (
            <p className="text-sm text-gray-700">{labelType === 'ppds'
              ? 'UK PPDS labels require an active UK location where this menu item is available.'
              : 'There are no active locations available for this menu item.'}</p>
          ) : (
            <label className="block space-y-1 text-sm font-semibold text-gray-900">
              Location
              <select
                className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={selectedLocationId}
                onChange={event => setSelectedLocationId(event.target.value)}
              >
                {eligibleLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {[location.name, location.city, location.country].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {labelType && selectedMenuItem && selectedLocation && selectedJurisdiction && (
            <PpdsLabelEditor
              key={`${selectedLocation.slug}:${selectedMenuItem.id}:${labelType}`}
              siteSlug={selectedLocation.slug}
              jurisdiction={selectedJurisdiction}
              item={selectedMenuItem}
              labelType={labelType}
            />
          )}
          {labelType && selectedLocation && !selectedJurisdiction && (
            <p role="alert" className="text-sm text-red-800">Set a valid jurisdiction for this location before creating labels.</p>
          )}
        </section>
      )}
    </div>
  )
}
