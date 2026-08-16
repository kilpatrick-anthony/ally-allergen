import { auditInternal, internalErrorResponse, requireInternalActor } from '@/lib/internal-auth'

const allowedFields = [
  'first_name', 'last_name', 'work_email', 'personal_email', 'phone', 'job_title', 'department',
  'manager_employee_id', 'employment_status', 'employment_type', 'start_date', 'end_date',
  'probation_end_date', 'residence_permit_type', 'residence_permit_expiry', 'notes',
] as const

function employeeInput(body: Record<string, unknown>) {
  return Object.fromEntries(allowedFields.filter((field) => field in body).map((field) => [field, body[field] === '' ? null : body[field]]))
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { actor, supabase } = await requireInternalActor('people')
    const body = await request.json()
    const { data, error } = await supabase.from('hr_employees').update({
      ...employeeInput(body),
      updated_by: actor.userId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single()
    if (error) throw error
    await auditInternal(supabase, actor, 'employee.updated', 'employee', id, { fields: Object.keys(employeeInput(body)) })
    return Response.json({ employee: data })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
