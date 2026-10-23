import { compareDateAdded, normalizeAllergenFilter } from '@/lib/regular-list-actions'

export type ItemCollection = 'ingredients' | 'menu-builder'
export interface NavigationItem {
  id: string
  name: string
  description?: string | null
  category?: string | null
  status?: string | null
  is_active?: boolean
  item_type?: string | null
  site_id?: string | null
  created_at?: string | null
  certifications?: string[] | null
  allergen_warnings?: Record<string, unknown> | null
}

/** Match the management lists' filters, category grouping and within-group order. */
export function orderedNavigationItems(collection: ItemCollection, rows: NavigationItem[], returnTo: string, uncategorized = 'Uncategorized'): NavigationItem[] {
  const queryStart = returnTo.indexOf('?')
  const params = new URLSearchParams(queryStart >= 0 ? returnTo.slice(queryStart + 1) : '')
  const search = (params.get('q') || '').toLowerCase()
  const category = params.get('category') || 'all'
  const requestedStatus = params.get('status') || 'all'
  const status = collection === 'menu-builder' && !['active', 'inactive'].includes(requestedStatus) ? 'all' : requestedStatus
  const direction = params.get('direction') === 'desc' ? 'desc' : 'asc'
  const sort = params.get('sort') || 'name'
  const allergen = normalizeAllergenFilter(params.get('allergen'))
  const certification = params.get('certification') || 'all'
  const scope = params.get('scope') || 'all'
  const requestedType = params.get('type') || 'all'
  const type = ['prepared', 'packaged_product'].includes(requestedType) ? requestedType : 'all'
  const filtered = rows.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search) || (collection === 'menu-builder' && (item.description || '').toLowerCase().includes(search))
    const matchesCategory = category === 'all' || (category === 'uncategorized' ? !item.category : item.category === category)
    const itemStatus = collection === 'ingredients'
      ? item.status === 'review' ? 'inactive' : item.status || 'active'
      : item.status || (item.is_active ? 'active' : 'inactive')
    if (!matchesSearch || !matchesCategory || (status !== 'all' && status !== itemStatus)) return false
    if (collection === 'ingredients') {
      const level = item.allergen_warnings?.[allergen]
      return (allergen === 'all' || (typeof level === 'string' && level !== 'none' && Boolean(level))) &&
        (certification === 'all' || Boolean(item.certifications?.includes(certification)))
    }
    return (type === 'all' || (item.item_type || 'prepared') === type) &&
      (scope === 'all' || (scope === 'global' ? !item.site_id : item.site_id === scope))
  })
  const ordered = [...filtered].sort((a, b) => {
    if (sort === 'date') return compareDateAdded(a.created_at, b.created_at, direction) || a.name.localeCompare(b.name)
    if (sort === 'status' && collection === 'ingredients') {
      const statusOf = (item: NavigationItem) => item.status === 'review' ? 'inactive' : item.status || 'active'
      return statusOf(a).localeCompare(statusOf(b)) * (direction === 'asc' ? 1 : -1)
    }
    return a.name.localeCompare(b.name) * (direction === 'asc' ? 1 : -1)
  })
  if (sort === 'date') return ordered
  const emptyCategory = collection === 'ingredients' ? 'Uncategorized' : uncategorized
  const groups = new Map<string, NavigationItem[]>()
  for (const item of ordered) {
    const key = item.category || emptyCategory
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return [...groups.keys()].sort((a, b) => a === emptyCategory ? 1 : b === emptyCategory ? -1 : a.localeCompare(b)).flatMap(key => groups.get(key)!)
}

export function adjacentItems(items: NavigationItem[], currentId: string) {
  const index = items.findIndex(item => item.id === currentId)
  return { previous: index > 0 ? items[index - 1] : null, next: index >= 0 ? items[index + 1] || null : null, position: index + 1, total: items.length }
}
