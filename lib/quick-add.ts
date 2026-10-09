export type QuickAddKind = 'ingredient' | 'packaged_product'

export type QuickAddFields = {
  kind: QuickAddKind
  name: string
  site_id: string | null
  supplier_id: string | null
  supplier_name: string
  notes: string
}

export type QuickAddDraft = QuickAddFields & {
  id: string
  status: 'draft'
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}
