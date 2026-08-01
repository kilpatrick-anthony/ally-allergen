// app/api/stripe/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
    }

    const body = await request.text()
    const stripe = getStripeClient()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    const supabase = createServiceClient()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscriptionState(supabase, subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await syncInvoiceState(supabase, invoice, 'active')
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await syncInvoiceState(supabase, invoice, 'past_due')
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function syncSubscriptionState(supabase: ReturnType<typeof createServiceClient>, subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (!customerId) return

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, settings, status')

  if (error || !businesses) {
    throw error || new Error('Failed to load businesses for Stripe webhook sync')
  }

  const matching = businesses.find((business: any) =>
    business?.settings?.subscription?.stripeCustomerId === customerId ||
    business?.settings?.subscription?.stripeSubscriptionId === subscription.id
  )

  if (!matching) return

  const currentStatus = subscription.status === 'canceled' ? 'inactive' : matching.status
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
    : null

  const nextSettings = {
    ...(matching.settings || {}),
    subscription: {
      ...(matching.settings?.subscription || {}),
      status: subscription.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      stripeCanceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    },
  }

  const { error: updateError } = await supabase
    .from('businesses')
    .update({
      status: currentStatus,
      settings: nextSettings,
    })
    .eq('id', matching.id)

  if (updateError) {
    throw updateError
  }
}

async function syncInvoiceState(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice,
  fallbackStatus: 'active' | 'past_due'
) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, settings')

  if (error || !businesses) {
    throw error || new Error('Failed to load businesses for invoice webhook sync')
  }

  const matching = businesses.find((business: any) =>
    business?.settings?.subscription?.stripeCustomerId === customerId
  )

  if (!matching) return

  const nextSettings = {
    ...(matching.settings || {}),
    subscription: {
      ...(matching.settings?.subscription || {}),
      status: invoice.status === 'paid' ? 'active' : fallbackStatus,
      lastInvoiceId: invoice.id,
      lastInvoiceStatus: invoice.status,
    },
  }

  const { error: updateError } = await supabase
    .from('businesses')
    .update({ settings: nextSettings })
    .eq('id', matching.id)

  if (updateError) {
    throw updateError
  }
}