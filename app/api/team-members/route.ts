import { listTeamMembers, inviteTeamMember, requireOwnerContext, teamErrorResponse, type TeamRole } from '@/lib/team-management'

export async function GET() {
  try {
    const { supabase, actor, businessId } = await requireOwnerContext()
    return Response.json({ members: await listTeamMembers(supabase, businessId), currentUserId: actor.userId })
  } catch (error) {
    return teamErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, actor, businessId } = await requireOwnerContext()
    const body = await request.json()
    const { data: business } = await supabase.from('businesses').select('name').eq('id', businessId).maybeSingle()
    await inviteTeamMember({
      supabase, businessId, invitedBy: actor.userId, businessName: business?.name,
      name: body.name || '', email: body.email || '', role: body.role as TeamRole,
    })
    return Response.json({ members: await listTeamMembers(supabase, businessId) }, { status: 201 })
  } catch (error) {
    return teamErrorResponse(error)
  }
}
