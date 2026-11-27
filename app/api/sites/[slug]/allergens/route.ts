import { NextResponse } from 'next/server'
import { z } from 'zod'
import { allergenAnswerIssues, ingredientAssessmentIssues, ingredientAssessmentWarnings, mergeAllergenAssessments, type IngredientAssessmentIssue, type IngredientAssessmentSource } from '@/lib/allergen-assessment'
import { getGuidePublication, locationAllergenContext, locationAllergenFailure, sourceFingerprint } from '@/lib/server/location-allergens'
import { reviewBowlSource, type BowlSource } from '@/lib/server/bowl-guide'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'

type AssessmentProblem = (IngredientAssessmentIssue & { ingredientId?: string; ingredientName?: string }) | { kind: 'bowl_configuration'; message: string }
type DishAssessmentProblems = { id: string; name: string; problems: AssessmentProblem[] }

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
    bowl_source?: BowlSource
    ingredient_assessments: (IngredientAssessmentSource & { id?: string | null; name?: string | null })[]
  })[] }
  const incomplete: DishAssessmentProblems[] = []
  const items = candidate.items.map(({ ingredient_assessments, bowl_source, ...item }) => {
    const linked = ingredient_assessments.length > 0
    const warnings = linked
      ? mergeAllergenAssessments(ingredient_assessments.map(ingredientAssessmentWarnings))
      : item.allergen_warnings
    const problems: AssessmentProblem[] = linked
      ? ingredient_assessments.flatMap<AssessmentProblem>(source => source.id === null
        ? [{ kind: 'unavailable' as const }]
        : ingredientAssessmentIssues(source).map(issue => ({
          ...issue, ingredientId: source.id || undefined, ingredientName: source.name || undefined,
        })))
      : allergenAnswerIssues(warnings)
    if (linked) {
      for (const issue of allergenAnswerIssues(warnings)) {
        if (!problems.some(problem => problem.kind === issue.kind && 'allergen' in problem && problem.allergen === issue.allergen)) {
          // The rollup flag repeats the source failures already shown above.
          if (issue.kind !== 'incomplete' || !problems.length) problems.push(issue)
        }
      }
    }
    if (problems.length && linked && warnings) warnings.assessment_incomplete = true
    const bowlReview = bowl_source && reviewBowlSource(bowl_source)
    if (bowlReview) problems.push(...bowlReview.problems)
    if (problems.length) {
      incomplete.push({ id: item.id, name: item.name, problems })
    }
    return { ...item, allergen_warnings: warnings, ...(bowlReview?.bowl && { bowl: bowlReview.bowl }) }
  })
  return { fingerprint: candidate.fingerprint, items, incomplete }
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
      incomplete: candidate?.incomplete ?? [],
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
    if (candidate.incomplete.length > 0) {
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
