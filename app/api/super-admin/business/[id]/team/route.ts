import { inviteTeamMember, listTeamMembers, requireSuperAdminContext, teamErrorResponse, type TeamRole } from '@/lib/team-management'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, actor } = await requireSuperAdminContext()
    const { id } = await params
    return Response.json({ members: await listTeamMembers(supabase, id), currentUserId: actor.userId })
  } catch (error) {
    return teamErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, actor } = await requireSuperAdminContext()
    const { id } = await params
    const body = await request.json()
    const { data: business } = await supabase.from('businesses').select('name').eq('id', id).maybeSingle()
    if (!business) return Response.json({ error: 'Business not found' }, { status: 404 })
    await inviteTeamMember({
      supabase, businessId: id, invitedBy: actor.userId, businessName: business.name,
      name: body.name || '', email: body.email || '', role: body.role as TeamRole,
    })
    return Response.json({ members: await listTeamMembers(supabase, id) }, { status: 201 })
  } catch (error) {
    return teamErrorResponse(error)
  }
}
