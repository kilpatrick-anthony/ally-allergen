import { auditInternal, internalErrorResponse, requireInternalActor } from '@/lib/internal-auth'

const definitions = {
  document: {
    table: 'hr_documents',
    fields: ['employee_id', 'category', 'title', 'drive_file_id', 'drive_url', 'issued_on', 'expires_on', 'status', 'notes'],
  },
  probation: {
    table: 'hr_probation_updates',
    fields: ['employee_id', 'review_date', 'stage', 'status', 'score', 'summary', 'actions', 'next_review_date', 'reviewer_user_id'],
  },
  objective: {
    table: 'hr_objectives',
    fields: ['employee_id', 'title', 'description', 'success_measure', 'owner_user_id', 'due_date', 'status', 'progress', 'completed_at'],
  },
  review: {
    table: 'hr_reviews',
    fields: ['employee_id', 'title', 'review_date', 'period_start', 'period_end', 'status', 'overall_score', 'strengths', 'development_areas', 'manager_comments', 'employee_comments', 'reviewer_user_id', 'acknowledged_at'],
  },
} as const

type RecordKind = keyof typeof definitions

function getDefinition(kind: unknown) {
  if (!kind || !(String(kind) in definitions)) return null
  return definitions[String(kind) as RecordKind]
}

function cleanInput(body: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => field in body).map((field) => [field, body[field] === '' ? null : body[field]]))
}

function validate(kind: string, values: Record<string, unknown>) {
  if (!values.employee_id) return 'An employee is required.'
  if (kind === 'document') {
    const url = String(values.drive_url || '')
    if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(url)) return 'Use a secure Google Drive or Google Docs link.'
    if (!values.title) return 'A document title is required.'
  }
  if (kind === 'objective' && !values.title) return 'An objective title is required.'
  if ((kind === 'probation' || kind === 'review') && !values.review_date) return 'A review date is required.'
  return null
}

export async function POST(request: Request) {
  try {
    const { actor, supabase } = await requireInternalActor('people')
    const body = await request.json()
    const definition = getDefinition(body.kind)
    if (!definition) return Response.json({ error: 'Unknown record type.' }, { status: 400 })
    const values = cleanInput(body, definition.fields)
    const validationError = validate(String(body.kind), values)
    if (validationError) return Response.json({ error: validationError }, { status: 400 })
    const { data, error } = await supabase.from(definition.table).insert({
      ...values,
      created_by: actor.userId,
    }).select('*').single()
    if (error) throw error
    await auditInternal(supabase, actor, `${body.kind}.created`, String(body.kind), data.id, { employeeId: values.employee_id })
    return Response.json({ record: data }, { status: 201 })
  } catch (error) {
    return internalErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { actor, supabase } = await requireInternalActor('people')
    const body = await request.json()
    const definition = getDefinition(body.kind)
    if (!definition || !body.id) return Response.json({ error: 'Record type and ID are required.' }, { status: 400 })
    const values = cleanInput(body, definition.fields)
    const { data, error } = await supabase.from(definition.table).update({
      ...values,
      updated_at: new Date().toISOString(),
    }).eq('id', body.id).select('*').single()
    if (error) throw error
    await auditInternal(supabase, actor, `${body.kind}.updated`, String(body.kind), body.id, { fields: Object.keys(values) })
    return Response.json({ record: data })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
