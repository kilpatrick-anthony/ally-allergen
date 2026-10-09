import { createServiceClient } from '@/lib/supabase/server'
import { buildEngagement, emptyEngagement, type EngagementEvent } from './engagement'

export async function loadEngagement(
  supabase: ReturnType<typeof createServiceClient>, businessId: string, siteId: string | null,
  start: Date, end: Date, timezone: string,
) {
  try {
    const events: EngagementEvent[] = []
    // Supabase caps each response. Page explicitly so busy businesses are not silently undercounted.
    for (let offset = 0; ; offset += 1000) {
      let query = supabase.from('kiosk_analytics_events')
        .select('id,event_type,source,access_point_id,site_id,session_id,search_query,result_count,filters_active,created_at')
        .eq('business_id', businessId).gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
        .order('created_at').order('id').range(offset, offset + 999)
      if (siteId) query = query.eq('site_id', siteId)
      const { data, error } = await query
      if (error) throw error
      events.push(...(data || []))
      if ((data || []).length < 1000) break
      if (events.length >= 50000) throw new Error('Select a shorter range for detailed engagement')
    }
    const names: Record<string, string> = {}
    const definitions = [
      { table: 'sites', field: 'id', name: 'name', source: 'site' },
      { table: 'website_links', field: 'id', name: 'name', source: 'website' },
      { table: 'qr_code_deployments', field: 'public_code', name: 'name', source: 'qr' },
      { table: 'devices', field: 'id', name: 'device_name', source: 'kiosk' },
    ]
    await Promise.all(definitions.map(async ({ table, field, name, source }) => {
      const ids = [...new Set(events.map(event => source === 'site' ? event.site_id : event.source === source ? event.access_point_id : null).filter((id): id is string => !!id))]
      for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await supabase.from(table).select(`${field},${name}`).eq('business_id', businessId).in(field, ids.slice(offset, offset + 100))
        if (error) throw error
        for (const row of (data || []) as unknown as Record<string, string>[]) names[`${source}:${row[field]}`] = row[name]
      }
    }))
    return buildEngagement(events, names, timezone)
  } catch (error) {
    console.warn('Detailed engagement unavailable:', error)
    return emptyEngagement(timezone)
  }
}
