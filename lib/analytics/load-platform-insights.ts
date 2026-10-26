import type { createServiceClient } from '@/lib/supabase/server'
import { platformAccumulator, type PlatformEvent } from './platform-insights'
import type { platformRange } from './platform-range'

export async function loadPlatformInsights(
  db: ReturnType<typeof createServiceClient>,
  period: ReturnType<typeof platformRange>,
  includeDemo: boolean,
  generatedAt: string,
) {
  const businesses = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from('businesses')
      .select('id,plan_type')
      .order('id')
      .range(offset, offset + 999)
    if (error) throw new Error('Could not load businesses for this report.')
    for (const row of data || []) if (includeDemo || row.plan_type !== 'demo') businesses.add(row.id)
    if ((data || []).length < 1000) break
  }
  const aggregate = platformAccumulator(period.range, businesses, includeDemo, generatedAt)
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from('kiosk_analytics_events')
      .select(
        'id,business_id,event_type,search_query,selected_allergens,result_count,filters_active,session_id,source,access_point_id,site_id,created_at',
      )
      .gte('created_at', period.previousStart.toISOString())
      .lt('created_at', period.currentEnd.toISOString())
      .order('created_at')
      .order('id')
      .range(offset, offset + 999)
    if (error) throw new Error('Could not load search activity. Please try again.')
    for (const event of (data || []) as PlatformEvent[]) aggregate.add(event)
    if ((data || []).length < 1000) break
  }
  return aggregate.result()
}
