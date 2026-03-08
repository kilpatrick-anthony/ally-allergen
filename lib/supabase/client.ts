/// <reference path="../../types/supabase.d.ts" />
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Create client with additional options
  const client = createBrowserClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // Enable URL session detection
      flowType: 'pkce' // Use PKCE flow (default, more secure)
    },
    global: {
      headers: {
        'x-application-name': 'ally-admin'
      }
    }
  })
  
  console.log('🔧 Supabase client created successfully')
  return client
}
