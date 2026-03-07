// app/api/stripe/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    // In a real implementation, you would:
    // 1. Verify the webhook signature using Stripe's webhook secret
    // 2. Parse the event and handle different event types
    // 3. Update subscription status in your database

    // For now, we'll just log the webhook and return success
    console.log('Stripe webhook received:', { body: body.substring(0, 500), sig })

    // Example event handling (simplified)
    const event = JSON.parse(body)
    const supabase = createServiceClient()

    switch (event.type) {
      case 'customer.subscription.created':
        // Handle new subscription
        console.log('New subscription created:', event.data.object.id)
        break
      case 'customer.subscription.updated':
        // Handle subscription update
        console.log('Subscription updated:', event.data.object.id)
        break
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        console.log('Subscription cancelled:', event.data.object.id)
        break
      case 'invoice.payment_succeeded':
        // Handle successful payment
        console.log('Payment succeeded for invoice:', event.data.object.id)
        break
      case 'invoice.payment_failed':
        // Handle failed payment
        console.log('Payment failed for invoice:', event.data.object.id)
        break
      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}