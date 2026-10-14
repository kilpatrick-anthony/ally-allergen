import { NextRequest, NextResponse } from 'next/server'
import { quickAddContext, quickAddFailure } from '@/lib/server/quick-add'
import { readPhoto } from '@/lib/server/quick-add-photos'
import { extractPhotoSuggestions } from '@/lib/server/quick-add-photo-extraction'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    await quickAddContext()
    const { bytes } = await readPhoto(request)
    const suggestions = await extractPhotoSuggestions(bytes, request)
    // Scanning does not persist a draft, evidence or the model's suggestions.
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
