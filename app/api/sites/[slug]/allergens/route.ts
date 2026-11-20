import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAllergenAssessmentComplete, isIngredientAssessmentComplete, mergeAllergenAssessments } from '@/lib/allergen-assessment'
import { getGuidePublication, locationAllergenContext, locationAllergenFailure, sourceFingerprint } from '@/lib/server/location-allergens'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'

import type { AllergenWarnings } from '@/types/allergen'

function normalized(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(normalized).join(',') + ']'
  if (value && typeof value === 'object') {
    return '{' + Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => JSON.stringify(key) + ':' + normalized(entry)).join(',') + '}'
  }
  return JSON.stringify(value)
}

type Context = { params: Promise<{ slug: string }> }

async function guideReview(context: Awaited<ReturnType<typeof locationAllergenContext>>) {
  const { data, error } = await context.supabase.rpc('review_site_allergens', {
    p_site: context.site.id, p_business: context.businessId,
  })
  if (error) throw error
  if (!data) return null
  const candidate = data as { fingerprint: string; items: (MenuItem & {
    ingredient_assessments: { allergen_warnings: AllergenWarnings; status: string | null; supplier_profiles: unknown }[]
  })[] }
  const items = candidate.items.map(({ ingredient_assessments, ...item }) => {
    if (!ingredient_assessments.length) return item
    const allergens = mergeAllergenAssessments(ingredient_assessments.map(source => source.allergen_warnings || {}))
    if (ingredient_assessments.some(source =>
      source.status !== 'active' || !isIngredientAssessmentComplete(source.allergen_warnings, source.supplier_profiles))) {
      allergens.assessment_incomplete = true
    }
    return { ...item, allergen_warnings: allergens }
  })
  return { fingerprint: candidate.fingerprint, items }
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await locationAllergenContext((await params).slug)
    const [candidate, publication] = await Promise.all([
      guideReview(context),
      getGuidePublication(context.supabase, context.site.id, context.site.jurisdiction),
    ])
    const items = candidate?.items || []
    return NextResponse.json({
      canApprove: context.role !== 'staff',
      fingerprint: candidate?.fingerprint ?? null,
      items,
      incomplete: items.filter(item => !isAllergenAssessmentComplete(item.allergen_warnings)).map(item => item.name),
      publication: publication && { id: publication.id, publishedAt: publication.published_at },
      unpublishedChanges: Boolean(publication && normalized(publication.items) !== normalized(items)),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return locationAllergenFailure(error)
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const context = await locationAllergenContext((await params).slug, true)
    const input = z.object({ fingerprint: sourceFingerprint, reviewed: z.literal(true) })
      .safeParse(await request.json().catch(() => null))
    if (!input.success) return NextResponse.json({ error: 'Review the current menu before publishing.' }, { status: 400 })

    const candidate = await guideReview(context)
    if (!candidate || candidate.fingerprint !== input.data.fingerprint) {
      return NextResponse.json({ error: 'Menu changed. Reload it and review before publishing.' }, { status: 409 })
    }
    if (candidate.items.some(item => !isAllergenAssessmentComplete(item.allergen_warnings))) {
      return NextResponse.json({ error: 'Complete the allergen assessment for each active menu item before publishing.' }, { status: 409 })
    }
    const { data, error } = await context.supabase.rpc('publish_site_allergens', {
      p_site: context.site.id, p_business: context.businessId, p_actor: context.userId, p_expected: input.data.fingerprint, p_items: candidate.items,
    })
    if (error?.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
    if (error) throw error
    return NextResponse.json({ id: data })
  } catch (error) {
    return locationAllergenFailure(error)
  }
}
