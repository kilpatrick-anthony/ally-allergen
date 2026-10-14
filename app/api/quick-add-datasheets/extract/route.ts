import { NextRequest, NextResponse } from 'next/server'
import { quickAddContext, quickAddFailure } from '@/lib/server/quick-add'
import { readDatasheet } from '@/lib/server/quick-add-datasheets'
import { extractDatasheetSuggestions } from '@/lib/server/quick-add-datasheet-extraction'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    await quickAddContext()
    const { bytes, fileName, contentType } = await readDatasheet(request)
    const suggestions = await extractDatasheetSuggestions(bytes, { file_name: fileName, content_type: contentType }, request)
    // Analysis creates no draft or storage object; save retains the selected evidence.
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
