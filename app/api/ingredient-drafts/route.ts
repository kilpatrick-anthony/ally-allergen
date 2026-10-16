import { NextResponse } from 'next/server'
import { ingredientDraftAccess } from '@/lib/server/ingredient-drafts'

export async function GET() {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { data, error } = await access.db.from('ingredient_drafts').select('id, name:payload->>name, updated_at, version').eq('business_id', access.businessId).is('ingredient_id', null).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load ingredient drafts' }, { status: 500 })
  return NextResponse.json({ drafts: data.map(row => ({ ...row, payload: { name: row.name } })) })
}
