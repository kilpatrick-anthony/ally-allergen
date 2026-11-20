import { NextResponse } from 'next/server'
import { z } from 'zod'
import { quickAddContext, QuickAddError } from '@/lib/server/quick-add'
import { isJurisdiction, type Jurisdiction } from '@/lib/location-jurisdiction'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'
import type { createServiceClient } from '@/lib/supabase/server'

type Db = ReturnType<typeof createServiceClient>

export interface GuidePublication {
  id: string
  jurisdiction: Jurisdiction
  published_at: string
  items: MenuItem[]
}

export async function getGuidePublication(db: Db, siteId: string, jurisdiction: Jurisdiction) {
  const { data, error } = await db.from('site_allergen_publications')
    .select('id,jurisdiction,published_at,items')
    .eq('site_id', siteId).order('published_at', { ascending: false }).order('id', { ascending: false }).limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.jurisdiction === jurisdiction ? data as GuidePublication : null
}

export async function locationAllergenContext(slug: string, approvalRequired = false) {
  const actor = await quickAddContext()
  if (approvalRequired && actor.role === 'staff') {
    throw new QuickAddError('Only owners and managers can approve location information.', 403)
  }
  const { data, error } = await actor.supabase.from('sites').select('id,name,jurisdiction,is_active')
    .eq('business_id', actor.businessId).eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!data || !isJurisdiction(data.jurisdiction)) throw new QuickAddError('Location not found.', 404)
  return { ...actor, site: { ...data, jurisdiction: data.jurisdiction } }
}

export function locationAllergenFailure(error: unknown) {
  if (error instanceof QuickAddError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('Location allergen request failed:', error)
  return NextResponse.json({ error: 'Could not load or save location allergen information.' }, { status: 503 })
}

export const sourceFingerprint = z.string().regex(/^[0-9a-f]{32}$/)
