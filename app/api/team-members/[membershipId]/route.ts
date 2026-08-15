import { removeTeamMember, requireOwnerContext, teamErrorResponse, updateTeamMember, type TeamRole } from '@/lib/team-management'

export async function PATCH(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { supabase, actor, businessId } = await requireOwnerContext()
    const { membershipId } = await params
    const body = await request.json()
    await updateTeamMember(supabase, businessId, membershipId, { name: body.name || '', role: body.role as TeamRole }, actor.userId)
    return Response.json({ ok: true })
  } catch (error) {
    return teamErrorResponse(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { supabase, actor, businessId } = await requireOwnerContext()
    const { membershipId } = await params
    await removeTeamMember(supabase, businessId, membershipId, actor.userId)
    return Response.json({ ok: true })
  } catch (error) {
    return teamErrorResponse(error)
  }
}
