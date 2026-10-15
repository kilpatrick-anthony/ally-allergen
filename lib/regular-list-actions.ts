import { ALLERGEN_LIST } from '@/types/allergen'

export function normalizeAllergenFilter(value: string | null): string {
  if (ALLERGEN_LIST.some(allergen => allergen.id === value)) return value!
  // Keep links created by the old numbered filter working.
  const number = Number(value?.match(/^(\d+)\./)?.[1])
  return ALLERGEN_LIST.find(allergen => allergen.number === number)?.id || 'all'
}

export function compareDateAdded(a?: string | null, b?: string | null, direction: 'asc' | 'desc' = 'asc'): number {
  const first = a ? Date.parse(a) : NaN
  const second = b ? Date.parse(b) : NaN
  if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0
  if (!Number.isFinite(second)) return -1
  return direction === 'asc' ? first - second : second - first
}

export async function runIngredientBulkAction(ids: string[], action: 'archive' | 'delete') {
  const succeeded: string[] = [], failed: string[] = []
  const uniqueIds = [...new Set(ids)]
  // Bound concurrent requests, and retain failures for a targeted retry.
  for (let offset = 0; offset < uniqueIds.length; offset += 4) {
    const batch = uniqueIds.slice(offset, offset + 4)
    const outcomes = await Promise.allSettled(batch.map(async id => {
      const response = await fetch(`/api/ingredients/${encodeURIComponent(id)}`, action === 'archive'
        ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) }
        : { method: 'DELETE' })
      if (!response.ok) throw new Error('Ingredient action failed')
    }))
    outcomes.forEach((outcome, index) => (outcome.status === 'fulfilled' ? succeeded : failed).push(batch[index]))
  }
  return { succeeded, failed }
}
