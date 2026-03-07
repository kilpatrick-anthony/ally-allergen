// app/api/stripe/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Stripe OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?tab=billing&error=stripe_connection_failed`)
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?tab=billing&error=missing_authorization_code`)
    }

    // In a real implementation, you would:
    // 1. Exchange the authorization code for an access token
    // 2. Store the connected account ID in your database
    // 3. Update the business settings to mark Stripe as connected

    // For now, we'll simulate this by updating the business settings
    const supabase = createServiceClient()

    // Get the current user/business
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/signin`)
    }

    // Update business settings to mark Stripe as connected
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        settings: {
          stripeConnected: true,
          stripeAccountId: 'simulated_account_id', // In real implementation, this would be the actual account ID
          stripeConnectedAt: new Date().toISOString()
        }
      })
      .eq('id', user.user_metadata?.businessId)

    if (updateError) {
      console.error('Failed to update business settings:', updateError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?tab=billing&error=settings_update_failed`)
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?tab=billing&success=stripe_connected`)
  } catch (err) {
    console.error('Stripe callback error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?tab=billing&error=unexpected_error`)
  }
}