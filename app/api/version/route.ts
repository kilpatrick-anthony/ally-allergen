// app/api/version/route.ts
// Lightweight endpoint used by kiosk pages to detect new deployments.
// Returns the current Vercel deployment ID (set at build time).
// On self-hosted or local dev, falls back to the build timestamp.
import { NextResponse } from 'next/server'

const VERSION =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.BUILD_ID ||
  // Fallback: stringify the module evaluation time so local dev always
  // returns the same value within a session (no spurious reloads).
  'dev'

export async function GET() {
  return NextResponse.json(
    { version: VERSION },
    {
      headers: {
        // Never cache — kiosk must always get the freshest value.
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
