import type { AllergenLevel } from '@/types/allergen'
import type { QuickAddFields } from '@/lib/quick-add'

const PRODUCT_FIELDS = [
  'code', 'product_name', 'product_name_en', 'generic_name', 'brands',
  'categories', 'allergens_tags', 'traces_tags', 'ingredients_text',
  'ingredients_text_en', 'labels_tags', 'last_modified_t',
].join(',')

const ALLERGEN_TAGS: Record<string, string> = {
  gluten: 'cereals_gluten', wheat: 'cereals_gluten', rye: 'cereals_gluten',
  barley: 'cereals_gluten', oats: 'cereals_gluten', crustaceans: 'crustaceans',
  eggs: 'eggs', egg: 'eggs', fish: 'fish', peanuts: 'peanuts', peanut: 'peanuts',
  soybeans: 'soybeans', soybean: 'soybeans', soy: 'soybeans', milk: 'milk',
  nuts: 'nuts', 'tree-nuts': 'nuts', celery: 'celery', mustard: 'mustard',
  sesame: 'sesame', 'sesame-seeds': 'sesame', sulphites: 'sulphites',
  'sulfur-dioxide-and-sulphites': 'sulphites', 'sulphur-dioxide-and-sulphites': 'sulphites',
  lupin: 'lupin', molluscs: 'molluscs', mollusks: 'molluscs',
}

const GLUTEN_TAGS: Record<string, string> = { wheat: 'wheat', rye: 'rye', barley: 'barley', oats: 'oats' }
const NUT_TAGS: Record<string, string> = {
  almonds: 'almonds', almond: 'almonds', hazelnuts: 'hazelnuts', hazelnut: 'hazelnuts',
  walnuts: 'walnuts', walnut: 'walnuts', cashews: 'cashews', cashew: 'cashews',
  pecans: 'pecans', pecan: 'pecans', 'brazil-nuts': 'brazil_nuts', 'brazil-nut': 'brazil_nuts',
  pistachios: 'pistachios', pistachio: 'pistachios', macadamia: 'macadamia',
  'macadamia-nuts': 'macadamia',
}

const DIETARY_LABELS: Record<string, string> = {
  vegan: 'Vegan', vegetarian: 'Vegetarian', 'gluten-free': 'Gluten-Free', halal: 'Halal',
  kosher: 'Kosher', organic: 'Organic', 'fair-trade': 'Fair Trade',
  'lactose-free': 'Lactose-Free', 'dairy-free': 'Dairy Free', 'coeliac-friendly': 'Coeliac-Friendly',
}

type Product = Record<string, unknown>
export type BarcodeSuggestions = {
  barcode: string
  name: string
  category: string
  supplier_name: ''
  description: string
  allergen_warnings: QuickAddFields['allergen_warnings']
  dietary_tags: string[]
  notes: string[]
  last_updated: string | null
  source_url: string
}

export class BarcodeLookupError extends Error {
  constructor(public code: 'barcodeNotFound' | 'barcodeUnavailable', public status: number) { super(code) }
}

const clean = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
const tagName = (value: unknown) => clean(value, 100).toLowerCase().replace(/^.*:/, '')

function productName(product: Product) {
  const name = clean(product.product_name || product.product_name_en || product.generic_name, 200)
  const brand = clean(product.brands, 100).split(',')[0].trim()
  if (!brand || name.toLowerCase().includes(brand.toLowerCase())) return name
  return `${brand} ${name}`.trim().slice(0, 200)
}

function applyTags(warnings: Record<string, unknown>, tags: unknown, level: AllergenLevel) {
  if (!Array.isArray(tags)) return
  for (const value of tags) {
    const tag = tagName(value)
    const parent = ALLERGEN_TAGS[tag]
    if (parent && warnings[parent] !== 'contains') warnings[parent] = level
    const gluten = GLUTEN_TAGS[tag]
    if (gluten) {
      const levels = (warnings.cereals_gluten_levels ||= {}) as Record<string, AllergenLevel>
      if (levels[gluten] !== 'contains') levels[gluten] = level
    }
    const nut = NUT_TAGS[tag]
    if (nut) {
      const levels = (warnings.nuts_levels ||= {}) as Record<string, AllergenLevel>
      if (levels[nut] !== 'contains') levels[nut] = level
    }
  }
}

export function mapOpenFoodFactsProduct(barcode: string, product: Product): BarcodeSuggestions {
  const allergen_warnings: Record<string, unknown> = {}
  applyTags(allergen_warnings, product.traces_tags, 'may_contain')
  applyTags(allergen_warnings, product.allergens_tags, 'contains')
  const labels = Array.isArray(product.labels_tags) ? product.labels_tags.map(tagName) : []
  const lastModified = Number(product.last_modified_t)
  const ingredients = clean(product.ingredients_text || product.ingredients_text_en, 1000)
  return {
    barcode, name: productName(product), category: clean(product.categories, 200).split(',')[0].trim(),
    supplier_name: '', description: ingredients ? `Ingredients: ${ingredients}` : '',
    allergen_warnings: allergen_warnings as QuickAddFields['allergen_warnings'],
    dietary_tags: [...new Set(labels.map(tag => DIETARY_LABELS[tag]).filter(Boolean))],
    notes: [], last_updated: Number.isFinite(lastModified) && lastModified > 0 ? new Date(lastModified * 1000).toISOString() : null,
    source_url: `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`,
  }
}

export async function lookupBarcode(barcode: string): Promise<BarcodeSuggestions> {
  const url = new URL(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}`)
  url.searchParams.set('fields', PRODUCT_FIELDS)
  url.searchParams.set('product_type', 'food')
  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'AllyJen/1.0 (https://allyjen.ie)' },
      cache: 'no-store', signal: AbortSignal.timeout(8000), redirect: 'follow',
    })
  } catch { throw new BarcodeLookupError('barcodeUnavailable', 503) }
  if (response.status === 404) throw new BarcodeLookupError('barcodeNotFound', 404)
  if (!response.ok) throw new BarcodeLookupError('barcodeUnavailable', 503)
  const data = await response.json().catch(() => null) as { product?: Product } | null
  if (!data?.product) throw new BarcodeLookupError('barcodeNotFound', 404)
  return mapOpenFoodFactsProduct(barcode, data.product)
}
