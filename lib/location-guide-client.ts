import type { Business, Ingredient, MenuItem } from '@/lib/hooks/useOfflineKioskData'

export async function fetchLocationGuide(target: string, siteId: string) {
  const query = new URLSearchParams({ target, site_id: siteId })
  const response = await fetch(`/api/kiosk/data?${query}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load the location’s allergen guide.')
  return await response.json() as { business: Business; menuItems: MenuItem[]; ingredients: Ingredient[] }
}

export async function downloadLocationGuide(target: string, siteId: string) {
  const { business, menuItems, ingredients } = await fetchLocationGuide(target, siteId)
  if (business.location?.jurisdiction !== 'IE' && !business.location?.publicationId) {
    throw new Error('Publish the location’s guide before printing it.')
  }
  const { generateAllergenTablePDF } = await import('@/lib/pdf/allergenTablePDF')
  await generateAllergenTablePDF({
    business,
    items: [
      ...menuItems.map(item => ({ ...item, itemType: 'menu_item' })),
      ...ingredients.map((ingredient, index) => ({
        ...ingredient, description: ingredient.description || null, price: 0,
        category: ingredient.category || 'ingredients', display_order: index,
        is_active: true, itemType: 'ingredient',
      })),
    ],
    title: 'Location allergen guide',
    showLegend: true,
  })
}
