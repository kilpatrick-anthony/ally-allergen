// lib/audit.ts - Shared helpers for recording and diffing changes to
// ingredients and menu items, powering the "Edit History" audit trail.

import type { createServiceClient } from '@/lib/supabase/server'

export type AuditEntityType = 'ingredient' | 'menu_item'
export type AuditAction = 'created' | 'updated' | 'deleted'

export interface AuditChange {
  field: string
  label: string
  from: string
  to: string
}

export interface AuditLogEntry {
  id: string
  business_id: string
  entity_type: AuditEntityType
  entity_id: string
  entity_name: string
  action: AuditAction
  changes: AuditChange[]
  changed_by: string | null
  changed_by_email: string | null
  changed_by_name: string | null
  created_at: string
}

/** Field definitions used to diff ingredient records for the audit trail. */
export const INGREDIENT_AUDIT_FIELDS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'allergen_warnings', label: 'Allergen warnings' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'certifications', label: 'Certifications / dietary' },
  { key: 'preferred_review_months', label: 'Review frequency (months)' },
  { key: 'status', label: 'Status' },
]

/** Field definitions used to diff menu item records for the audit trail. */
export const MENU_ITEM_AUDIT_FIELDS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'allergen_warnings', label: 'Allergen warnings' },
  { key: 'dietary', label: 'Dietary tags' },
  { key: 'is_active', label: 'Active' },
  { key: 'price', label: 'Price' },
  { key: 'preferred_review_months', label: 'Review frequency (months)' },
  { key: 'item_type', label: 'Supply type' },
  { key: 'supplier_id', label: 'Supplier' },
  { key: 'manufacturer', label: 'Manufacturer / brand' },
  { key: 'product_code', label: 'Product code' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'ingredient_declaration', label: 'Ingredient declaration' },
  { key: 'label_verified_at', label: 'Label verified' },
]

function humanizeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') {
    // allergen_warnings-style objects: only show keys with a non-"none" value
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v && v !== 'none')
      .map(([k, v]) => `${k}: ${v}`)
    return entries.length ? entries.join(', ') : '(none)'
  }
  return String(value)
}

/** Compares a "before" and "after" record across a set of tracked fields and returns human-readable diffs. */
export function diffRecordFields(
  before: Record<string, any> | null,
  after: Record<string, any>,
  fields: { key: string; label: string }[]
): AuditChange[] {
  const changes: AuditChange[] = []
  for (const { key, label } of fields) {
    const a = before ? before[key] : undefined
    const b = after[key]
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) {
      changes.push({ field: key, label, from: humanizeValue(a), to: humanizeValue(b) })
    }
  }
  return changes
}

/** Inserts a single audit log row. Failures are logged but never thrown — audit logging must not block the main request. */
export async function recordAuditLog(
  supabase: ReturnType<typeof createServiceClient>,
  entry: {
    businessId: string
    entityType: AuditEntityType
    entityId: string
    entityName: string
    action: AuditAction
    changes: AuditChange[]
    userId: string
    userEmail?: string | null
  }
): Promise<void> {
  // Nothing changed — don't clutter the trail with no-op updates
  if (entry.action === 'updated' && entry.changes.length === 0) return

  try {
    const { data: membership } = await supabase
      .from('user_businesses')
      .select('display_name')
      .eq('business_id', entry.businessId)
      .eq('user_id', entry.userId)
      .maybeSingle()
    const { error } = await supabase.from('audit_log').insert({
      business_id: entry.businessId,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      entity_name: entry.entityName,
      action: entry.action,
      changes: entry.changes,
      changed_by: entry.userId,
      changed_by_email: entry.userEmail || null,
      changed_by_name: membership?.display_name || null,
    })
    if (error) throw error
  } catch (err) {
    console.error('[audit] Failed to record audit log entry:', err)
  }
}
