import { auditInternal, internalErrorResponse, requireInternalActor } from '@/lib/internal-auth'

const allowedFields = [
  'first_name', 'last_name', 'work_email', 'personal_email', 'phone', 'job_title', 'department',
  'manager_employee_id', 'employment_status', 'employment_type', 'start_date', 'end_date',
  'probation_end_date', 'residence_permit_type', 'residence_permit_expiry', 'notes',
] as const

function employeeInput(body: Record<string, unknown>) {
  return Object.fromEntries(allowedFields.filter((field) => field in body).map((field) => [field, body[field] === '' ? null : body[field]]))
}

export async function POST(request: Request) {
  try {
    const { actor, supabase } = await requireInternalActor('people')
    const body = await request.json()
    if (!String(body.first_name || '').trim() || !String(body.last_name || '').trim()) {
      return Response.json({ error: 'First and last name are required.' }, { status: 400 })
    }
    const { data, error } = await supabase.from('hr_employees').insert({
      ...employeeInput(body),
      created_by: actor.userId,
      updated_by: actor.userId,
    }).select('*').single()
    if (error) throw error
    await auditInternal(supabase, actor, 'employee.created', 'employee', data.id, { name: `${data.first_name} ${data.last_name}` })
    return Response.json({ employee: data }, { status: 201 })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
