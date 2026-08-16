import { internalErrorResponse, requireInternalActor } from '@/lib/internal-auth'

export async function GET() {
  try {
    const { actor, supabase } = await requireInternalActor()
    const noData = () => Promise.resolve({ data: [], error: null })
    const [employees, documents, probation, objectives, reviews, members, audit] = await Promise.all([
      actor.canManagePeople ? supabase.from('hr_employees').select('*').order('last_name') : noData(),
      actor.canManagePeople ? supabase.from('hr_documents').select('*').order('expires_on', { ascending: true, nullsFirst: false }) : noData(),
      actor.canManagePeople ? supabase.from('hr_probation_updates').select('*').order('review_date', { ascending: false }) : noData(),
      actor.canManagePeople ? supabase.from('hr_objectives').select('*').order('due_date', { ascending: true, nullsFirst: false }) : noData(),
      actor.canManagePeople ? supabase.from('hr_reviews').select('*').order('review_date', { ascending: false }) : noData(),
      actor.canManageAccess ? supabase.from('internal_members').select('*').order('created_at') : Promise.resolve({ data: [], error: null }),
      actor.canManageAccess ? supabase.from('internal_audit_log').select('*').order('created_at', { ascending: false }).limit(40) : Promise.resolve({ data: [], error: null }),
    ])
    const firstError = [employees, documents, probation, objectives, reviews, members, audit].find((result) => result.error)?.error
    if (firstError) throw firstError
    return Response.json({
      actor,
      employees: employees.data || [],
      documents: documents.data || [],
      probation: probation.data || [],
      objectives: objectives.data || [],
      reviews: reviews.data || [],
      members: members.data || [],
      audit: audit.data || [],
    })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
