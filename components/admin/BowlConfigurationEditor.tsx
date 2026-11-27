'use client'

import { useEffect, useId, useState } from 'react'
import { bowlConfiguration, bowlConfigurationIssue, type BowlConfiguration } from '@/lib/bowl-configuration'

type Ingredient = { id: string; name: string; status: string }
type Draft = {
  configuration: BowlConfiguration | null
  ingredients: Ingredient[]
  recipe: string[]
  canConfigure: boolean
  occupied: boolean
}
type Group = BowlConfiguration['groups'][number]

const field = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-900'
const action = 'min-h-11 rounded-lg border border-teal-700 px-3 text-sm font-semibold disabled:opacity-50'

export function BowlConfigurationEditor({ itemId, sites }: { itemId: string; sites: { id: string; name: string }[] }) {
  const locationField = useId()
  const [siteId, setSiteId] = useState('')
  const site = sites.find(site => site.id === siteId)
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-slate-900">
      <h2 className="text-lg font-semibold">Build your bowl</h2>
      <p className="text-sm">Configure one prepared item per location. Save the standard recipe first, then select the ingredient and supplier records used at this location.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={locationField}>Location</label>
        <select id={locationField} className={field} value={site?.id ?? ''} onChange={event => setSiteId(event.target.value)}>
          <option value="">Choose a location</option>
          {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
      </div>
      {site && <LocationBowlEditor key={site.id} itemId={itemId} siteId={site.id} />}
    </section>
  )
}

function LocationBowlEditor({ itemId, siteId }: { itemId: string; siteId: string }) {
  const endpoint = `/api/menu-items/${encodeURIComponent(itemId)}/bowl`
  const [draft, setDraft] = useState<Draft>()
  const [configuration, setConfiguration] = useState<BowlConfiguration | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const request = new AbortController()
    fetch(`${endpoint}?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store', signal: request.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setDraft(data)
        setConfiguration(data.configuration)
      })
      .catch(err => { if (!request.signal.aborted) setError(err.message) })
    return () => request.abort()
  }, [endpoint, siteId])

  async function save(next: BowlConfiguration | null) {
    if (!draft) return
    setError('')
    setMessage('')
    if (next) {
      const result = bowlConfiguration.safeParse(next)
      const issue = result.success
        ? bowlConfigurationIssue(result.data, draft.recipe, new Set(draft.ingredients.map(ingredient => ingredient.id)))
        : 'Name each group and select at least one ingredient in each group.'
      if (issue) { setError(issue); return }
    }
    setBusy(true)
    try {
      const response = await fetch(endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, configuration: next }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setConfiguration(data.configuration)
      setDraft({ ...draft, configuration: data.configuration })
      setMessage('Draft saved. Review and publish the location allergen guide to update the QR guide and kiosk.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the bowl configuration.')
    } finally {
      setBusy(false)
    }
  }

  function updateGroup(index: number, group: Group) {
    if (configuration) {
      setConfiguration({ ...configuration, groups: configuration.groups.map((current, i) => i === index ? group : current) })
    }
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="text-sm text-teal-800">{message}</p>}
      {!draft && !error && <p role="status">Loading bowl configuration…</p>}
      {draft?.occupied && <p>This location already has a bowl configured on another menu item.</p>}
      {draft && !draft.occupied && !draft.canConfigure && <p>Choose an active prepared menu item at an active location.</p>}
      {draft?.canConfigure && !draft.occupied && (
        configuration ? (
          <fieldset disabled={busy} className="space-y-4">
            <p className="text-sm"><strong>Saved standard recipe</strong> · {draft.recipe.map(id => draft.ingredients.find(item => item.id === id)?.name ?? 'Unavailable ingredient').join(', ') || 'No ingredients linked'}</p>
            <IngredientChoices label="Fixed ingredients" selected={configuration.fixed} ingredients={draft.ingredients}
              onChange={fixed => setConfiguration({ ...configuration, fixed })} />
            {configuration.groups.map((group, index) => (
              <fieldset key={index} className="space-y-3 rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    Group name
                    <input className={field} value={group.name} maxLength={60} onChange={event => updateGroup(index, { ...group, name: event.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Choice type
                    <select className={field} value={group.kind} onChange={event => {
                      const kind = event.target.value as Group['kind']
                      updateGroup(index, { ...group, kind, defaults: kind === 'multiple' ? group.defaults : group.defaults.slice(0, 1) })
                    }}>
                      <option value="required">Required single choice</option>
                      <option value="optional">Optional single choice</option>
                      <option value="multiple">Multiple choices</option>
                    </select>
                  </label>
                  <button type="button" className={`${action} self-end`} onClick={() =>
                    setConfiguration({ ...configuration, groups: configuration.groups.filter((_, i) => i !== index) })}>Remove group</button>
                </div>
                <IngredientChoices label="Options" selected={group.options} ingredients={draft.ingredients}
                  onChange={options => updateGroup(index, { ...group, options, defaults: group.defaults.filter(id => options.includes(id)) })} />
                <fieldset className="flex flex-wrap gap-x-4">
                  <legend className="font-medium">Default choices</legend>
                  {group.kind === 'optional' && (
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="radio" name={`bowl-default-${index}`} checked={!group.defaults.length} onChange={() => updateGroup(index, { ...group, defaults: [] })} /> No default
                    </label>
                  )}
                  {group.options.map(id => (
                    <label key={id} className="flex min-h-11 items-center gap-2">
                      <input type={group.kind === 'multiple' ? 'checkbox' : 'radio'} name={`bowl-default-${index}`} checked={group.defaults.includes(id)}
                        onChange={event => updateGroup(index, { ...group, defaults: group.kind !== 'multiple' ? [id]
                          : event.target.checked ? [...group.defaults, id] : group.defaults.filter(value => value !== id) })} />
                      {draft.ingredients.find(ingredient => ingredient.id === id)?.name ?? 'Unavailable ingredient'}
                    </label>
                  ))}
                </fieldset>
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-3">
              <button type="button" className={action} disabled={configuration.groups.length >= 10} onClick={() =>
                setConfiguration({ ...configuration, groups: [...configuration.groups, { name: '', kind: 'required', options: [], defaults: [] }] })}>Add group</button>
              <button type="button" className={`${action} bg-teal-800 text-white`} onClick={() => void save(configuration)}>Save bowl draft</button>
              <button type="button" className={action} onClick={() => setConfiguration(draft.configuration)}>Discard edits</button>
            </div>
          </fieldset>
        ) : <button type="button" className={action} onClick={() => setConfiguration({ fixed: [...draft.recipe], groups: [
          { name: 'Base', kind: 'required', options: [], defaults: [] },
          { name: 'Toppings', kind: 'multiple', options: [], defaults: [] },
          { name: 'Drizzle', kind: 'optional', options: [], defaults: [] },
        ] })}>Configure bowl</button>
      )}
      {draft?.configuration && <button type="button" className={action} disabled={busy} onClick={() => void save(null)}>Disable bowl in next guide version</button>}
    </div>
  )
}

function IngredientChoices({ label, selected, ingredients, onChange }: {
  label: string; selected: string[]; ingredients: Ingredient[]; onChange: (ids: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1 text-sm">
        {label}
        <select className={field} value="" onChange={event => { if (event.target.value) onChange([...selected, event.target.value]) }}>
          <option value="">Add ingredient</option>
          {ingredients.filter(ingredient => !selected.includes(ingredient.id)).map(ingredient =>
            <option key={ingredient.id} value={ingredient.id}>{ingredient.name}{ingredient.status !== 'active' ? ' (needs review)' : ''}</option>)}
        </select>
      </label>
      {!!selected.length && <ul className="flex flex-wrap gap-2">
        {selected.map(id => {
          const name = ingredients.find(ingredient => ingredient.id === id)?.name ?? 'Unavailable ingredient'
          return <li key={id}><button type="button" className={action} aria-label={`Remove ${name} from ${label}`}
            onClick={() => onChange(selected.filter(value => value !== id))}>{name} ×</button></li>
        })}
      </ul>}
    </div>
  )
}
