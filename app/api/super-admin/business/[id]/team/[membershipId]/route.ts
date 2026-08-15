import { removeTeamMember, requireSuperAdminContext, teamErrorResponse, updateTeamMember, type TeamRole } from '@/lib/team-management'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  try {
    const { supabase, actor } = await requireSuperAdminContext()
    const { id, membershipId } = await params
    const body = await request.json()
    await updateTeamMember(supabase, id, membershipId, { name: body.name || '', role: body.role as TeamRole }, actor.userId, true)
    return Response.json({ ok: true })
  } catch (error) {
    return teamErrorResponse(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  try {
    const { supabase, actor } = await requireSuperAdminContext()
    const { id, membershipId } = await params
    await removeTeamMember(supabase, id, membershipId, actor.userId, true)
    return Response.json({ ok: true })
  } catch (error) {
    return teamErrorResponse(error)
  }
}
