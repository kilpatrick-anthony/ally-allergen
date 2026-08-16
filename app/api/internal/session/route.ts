import { canBootstrapInternal, internalErrorResponse, requireInternalActor } from '@/lib/internal-auth'

export async function GET() {
  try {
    const { actor } = await requireInternalActor()
    return Response.json({ authenticated: true, member: actor })
  } catch (error: any) {
    if (error?.code === 'NOT_AN_INTERNAL_MEMBER') {
      try {
        const bootstrap = await canBootstrapInternal()
        if (bootstrap.allowed) {
          return Response.json({ authenticated: true, eligibleForBootstrap: true })
        }
      } catch {}
    }
    return internalErrorResponse(error)
  }
}
