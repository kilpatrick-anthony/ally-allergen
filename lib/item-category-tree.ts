export interface CategorizedItem { category?: string | null; subcategory?: string | null }

export function categoryFields(body: Record<string, unknown>, previous?: CategorizedItem) {
  const text = (value: unknown) => {
    if (value == null) return ''
    if (typeof value !== 'string' || value.trim().length > 100 || /[\u0000-\u001f]/.test(value)) throw new Error('Category names must be text with at most 100 characters')
    return value.trim()
  }
  const category = text(body.category === undefined ? previous?.category : body.category)
  const subcategory = text(body.subcategory === undefined ? (body.category !== undefined && category !== (previous?.category || '') ? '' : previous?.subcategory) : body.subcategory)
  if (subcategory && !category) throw new Error('Choose a category before adding a subcategory')
  return { category, subcategory }
}

/** Keep direct members first, followed by named subcategories; retain item sorting within each group. */
export function orderSubcategories<T extends CategorizedItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = a.subcategory || '', right = b.subcategory || ''
    return left === right ? 0 : !left ? -1 : !right ? 1 : left.localeCompare(right)
  })
}

export function startsSubcategory<T extends CategorizedItem>(items: T[], index: number): boolean {
  return Boolean(items[index]?.subcategory && (index === 0 || items[index - 1].subcategory !== items[index].subcategory))
}

export function categorySections<T extends CategorizedItem>(items: T[]) {
  const groups = new Map<string, { category: string; subcategory: string; title: string; items: T[] }>()
  for (const item of items) {
    const category = item.category?.trim() || 'Uncategorized', subcategory = item.subcategory?.trim() || ''
    const key = JSON.stringify([category, subcategory])
    if (!groups.has(key)) groups.set(key, { category, subcategory, title: subcategory ? `${category} / ${subcategory}` : category, items: [] })
    groups.get(key)!.items.push(item)
  }
  return [...groups.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category === 'Uncategorized' ? 1 : b.category === 'Uncategorized' ? -1 : a.category.localeCompare(b.category)
    return a.subcategory === b.subcategory ? 0 : !a.subcategory ? -1 : !b.subcategory ? 1 : a.subcategory.localeCompare(b.subcategory)
  })
}
