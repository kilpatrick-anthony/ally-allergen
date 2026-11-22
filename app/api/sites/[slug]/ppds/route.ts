import { NextResponse } from 'next/server'
import { z } from 'zod'
import { QuickAddError } from '@/lib/server/quick-add'
import { locationAllergenContext, locationAllergenFailure, sourceFingerprint } from '@/lib/server/location-allergens'
import { buildLooseFoodAllergenLabel, buildPpdsLabel, canCreateLooseFoodLabel, ppdsReviewSources, type PpdsSource, type StoredPpdsLabel } from '@/lib/server/ppds-labels'
import { makeLooseFoodAllergenLabelPdf } from '@/lib/pdf/loose-food-allergen-label'
import { makePpdsLabelPdf } from '@/lib/pdf/ppds-label'
import { classifyPpds, emphasiseDeclaredAllergens, ppdsAnswers, ppdsLabelDraftLayoutInput, ppdsLabelInput, ppdsLabelSourceSelection, selectedLabelAllergenSources, type PpdsAnswers, type PpdsClassification } from '@/lib/ppds'

type RouteParams = { params: Promise<{ slug: string }> }
type Actor = Awaited<ReturnType<typeof locationAllergenContext>>
type Revision = {
  id: string
  classification: PpdsClassification
  answers: Partial<PpdsAnswers>
  label: StoredPpdsLabel | null
  source_fingerprint: string
  source: PpdsSource
  recorded_at: string
  recorded_by: string
}
type HistoryRevision = Pick<Revision, 'id' | 'classification' | 'label' | 'source' | 'recorded_at' | 'recorded_by'>

const itemIdInput = z.string().uuid()
const reviewContext = z.object({
  itemId: itemIdInput,
  expected: sourceFingerprint,
  previous: z.string().uuid().nullable(),
  answers: ppdsAnswers.optional(),
}).strict()
const reviewInput = z.discriminatedUnion('intent', [
  reviewContext.extend({ intent: z.enum(['classify', 'review', 'preview', 'approve']), label: ppdsLabelInput.optional() }),
  reviewContext.extend({
    intent: z.literal('preview-layout'),
    layout: ppdsLabelDraftLayoutInput,
    selections: z.array(ppdsLabelSourceSelection).max(100).default([]),
  }),
  z.object({
    intent: z.literal('download-loose-label'),
    itemId: itemIdInput,
    expected: sourceFingerprint,
    confirmedLooseFood: z.literal(true),
    selections: z.array(ppdsLabelSourceSelection.extend({ variantId: z.string().uuid() })).max(100),
  }).strict(),
])

async function readSource(actor: Actor, itemId: string) {
  const { data, error } = await actor.supabase.rpc('review_site_ppds_source', {
    p_site: actor.site.id, p_business: actor.businessId, p_item: itemId,
  })
  if (error) throw error
  if (!data?.source) throw new QuickAddError('Active menu item not found for this location.', 404)
  return data as { source: PpdsSource; fingerprint: string }
}

async function readCurrentRevision(actor: Actor, itemId: string) {
  const { data, error } = await actor.supabase.from('site_ppds_revisions')
    .select('id,classification,answers,label,source_fingerprint,source,recorded_at,recorded_by')
    .eq('site_id', actor.site.id).eq('menu_item_id', itemId)
    .order('recorded_at', { ascending: false }).order('id', { ascending: false }).limit(1)
  if (error) throw error
  return ((data || [])[0] || null) as Revision | null
}

async function readRevisionHistory(actor: Actor, itemId: string) {
  const { data, error } = await actor.supabase.from('site_ppds_revisions')
    .select('id,classification,label,source,recorded_at,recorded_by')
    .eq('site_id', actor.site.id).eq('menu_item_id', itemId)
    .order('recorded_at', { ascending: false }).order('id', { ascending: false }).limit(20)
  if (error) throw error
  return (data || []) as HistoryRevision[]
}

function mapHistory(revisions: HistoryRevision[]) {
  return revisions.map(revision => {
    const documents = ppdsReviewSources(revision.source).flatMap(row => row.documents)
    return {
      id: revision.id, date: revision.recorded_at, approved: Boolean(revision.label), actor: revision.recorded_by,
      classification: revision.classification,
      documents: revision.label?.input.specifications.map(spec => {
        const doc = documents.find(item => item.id === spec.documentId)
        return doc ? [doc.name, doc.version].filter(Boolean).join(' · ') : spec.documentId
      }) || [],
    }
  })
}

function staleReason(revision: Revision | null | undefined, source: PpdsSource, fingerprint: string) {
  if (!revision?.label) return null
  if (revision.source_fingerprint !== fingerprint) return 'Recipe or supplier data changed. Review the sources and approve a new label.'
  const documents = ppdsReviewSources(source).flatMap(row => row.documents)
  const expired = revision.label.input.specifications.some(spec => !documents.some(doc => doc.id === spec.documentId && doc.current))
  return expired ? 'A source specification is due for review. Update it and approve a new label.' : null
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const query = new URL(request.url).searchParams
    const printId = query.get('print')
    const actor = await locationAllergenContext((await params).slug, printId !== null)
    if (!query.has('item') && printId === null) {
      const { data, error } = await actor.supabase.rpc('site_ppds_overview', { p_site: actor.site.id, p_business: actor.businessId })
      if (error) throw error
      return NextResponse.json({ items: data }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    const itemId = itemIdInput.safeParse(query.get('item'))
    if (!itemId.success) return NextResponse.json({ error: 'Choose a valid menu item.' }, { status: 400 })
    if (query.get('history') === 'true') {
      const history = await readRevisionHistory(actor, itemId.data)
      return NextResponse.json({ history: mapHistory(history) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    const [{ source, fingerprint }, current] = await Promise.all([
      readSource(actor, itemId.data), readCurrentRevision(actor, itemId.data),
    ])
    const stale = staleReason(current, source, fingerprint)

    if (printId !== null) {
      if (!current?.label || current.id !== printId || stale) {
        return NextResponse.json({ error: stale || 'Only the current approved revision is available to print.' }, { status: 409 })
      }
      const { doc } = makePpdsLabelPdf(current.label.rendered)
      return new NextResponse(doc.output('arraybuffer'), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${current.classification === 'ingredient_label' ? 'ingredient-label' : 'ppds'}-${current.id}.pdf"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }

    return NextResponse.json({
      canApprove: actor.role !== 'staff',
      canCreateLooseLabel: canCreateLooseFoodLabel(source),
      fingerprint,
      foodName: source.item.name,
      ingredientDeclaration: source.item.ingredient_declaration,
      sources: ppdsReviewSources(source),
      stale,
      current: current ? {
        id: current.id, classification: current.classification, answers: current.answers,
        label: current.label, date: current.recorded_at,
      } : null,
      history: [],
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return locationAllergenFailure(error)
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await locationAllergenContext((await params).slug, true)
    const result = reviewInput.safeParse(await request.json().catch(() => null))
    if (!result.success) {
      const issue = result.error.issues[0]
      return NextResponse.json({ error: issue?.path.length ? `Check ${issue.path.join('.')}. ${issue.message}` : 'Complete the classification and review fields.' }, { status: 400 })
    }

    const input = result.data
    const { source, fingerprint } = await readSource(actor, input.itemId)
    if (fingerprint !== input.expected) {
      return NextResponse.json({ error: 'Recipe or supplier data changed. Reload the item and review its sources.' }, { status: 409 })
    }

    if (input.intent === 'download-loose-label') {
      try {
        const label = buildLooseFoodAllergenLabel(source, input.selections)
        const pdf = makeLooseFoodAllergenLabelPdf(label)
        return new NextResponse(pdf.output('arraybuffer'), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="allergen-only-label.pdf"',
            'Cache-Control': 'private, no-store',
          },
        })
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create the allergen-only label.' }, { status: 409 })
      }
    }

    const isIrishLocation = actor.site.jurisdiction === 'IE'
    let classification: PpdsClassification
    if (isIrishLocation && (input.intent === 'classify' || input.intent === 'review')) {
      return NextResponse.json({ error: 'Classification is available only for UK PPDS workflows.' }, { status: 400 })
    }
    if (isIrishLocation) {
      classification = 'ingredient_label'
    } else {
      if (!input.answers) {
        return NextResponse.json({ error: 'Complete the UK PPDS classification first.' }, { status: 400 })
      }
      classification = input.intent === 'review' ? 'review' : classifyPpds(input.answers)
    }
    let label: StoredPpdsLabel | null = null
    if (input.intent === 'preview-layout' || input.intent === 'preview' || input.intent === 'approve') {
      if (!isIrishLocation && classification !== 'ppds') {
        return NextResponse.json({ error: 'Complete the PPDS classification and label declaration.' }, { status: 400 })
      }
      try {
        if (input.intent === 'preview-layout') {
          const { ingredients, ...layout } = input.layout
          const allergens = selectedLabelAllergenSources(ppdsReviewSources(source), input.selections)
            .flatMap(entry => entry.containedAllergens ?? [])
          const rendered = { ...layout, ingredients: emphasiseDeclaredAllergens(ingredients, allergens) }
          const { xHeight, minimumXHeight } = makePpdsLabelPdf(rendered)
          return NextResponse.json({ label: rendered, xHeight, minimumXHeight })
        }
        if (!input.label) {
          return NextResponse.json({ error: 'Complete the ingredient declaration.' }, { status: 400 })
        }
        const built = buildPpdsLabel(source, input.label)
        label = built.label
        if (input.intent === 'preview') {
          return NextResponse.json({ label: label.rendered, xHeight: built.xHeight, minimumXHeight: built.minimumXHeight })
        }
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Review the label declaration.' }, { status: 409 })
      }
    }
    const { data, error } = await actor.supabase.rpc('record_site_ppds_revision', {
      p_site: actor.site.id, p_business: actor.businessId, p_item: input.itemId, p_actor: actor.userId,
      p_previous: input.previous, p_expected: input.expected, p_classification: classification,
      p_answers: input.answers || {}, p_label: label,
    })
    if (error?.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
    if (error) throw error
    return NextResponse.json({ id: data })
  } catch (error) {
    return locationAllergenFailure(error)
  }
}
