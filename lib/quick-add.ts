export type QuickAddKind = 'ingredient' | 'packaged_product'

export type QuickAddFields = {
  kind: QuickAddKind
  name: string
  site_id: string | null
  supplier_id: string | null
  supplier_name: string
  allergen_warnings: import('@/lib/quick-add-review').QuickAddReview['allergen_warnings']
  dietary_tags: string[]
  notes: string
}

export type QuickAddDraft = QuickAddFields & {
  id: string
  status: 'draft' | 'ready_for_review' | 'approved'
  review?: import('@/lib/quick-add-review').QuickAddReview
  submitted_at?: string | null
  submitted_by?: string | null
  approved_at?: string | null
  approved_by?: string | null
  return_note?: string
  ingredient_id?: string | null
  menu_item_id?: string | null
  author_name?: string
  site_name?: string
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}
