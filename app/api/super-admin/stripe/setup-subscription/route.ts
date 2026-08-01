// app/api/super-admin/stripe/setup-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover'
  })
  try {
    // Check if user is super admin
    const { data: { user }, error: userError } = await createServiceClient().auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, check if user has admin email - in production you'd have proper roles
    const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      businessId,
      plan,
      billingCycle,
      paymentMethod
    } = body

    if (!businessId || !plan || !paymentMethod) {
      return NextResponse.json(
        { error: 'Business ID, plan, and payment method are required' },
        { status: 400 }
      )
    }

    // Create or retrieve Stripe customer
    // In a real implementation, you'd look up the customer by business ID
    // For now, we'll create a new customer
    const customer = await stripe.customers.create({
      email: paymentMethod.billingName ? `${paymentMethod.billingName.toLowerCase().replace(/\s+/g, '.')}@temp.com` : 'customer@temp.com',
      name: paymentMethod.billingName || 'Business Customer',
      address: paymentMethod.billingAddress ? {
        line1: paymentMethod.billingAddress.split(',')[0]?.trim(),
        city: paymentMethod.billingAddress.split(',')[1]?.trim(),
        postal_code: paymentMethod.billingAddress.split(',')[2]?.trim(),
        country: 'US' // Default to US, should be parsed from address
      } : undefined
    })

    // Create payment method
    const paymentMethodStripe = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: paymentMethod.cardNumber.replace(/\s+/g, ''),
        exp_month: parseInt(paymentMethod.expiryMonth),
        exp_year: parseInt(paymentMethod.expiryYear),
        cvc: paymentMethod.cvc
      },
      billing_details: {
        name: paymentMethod.billingName,
        address: paymentMethod.billingAddress ? {
          line1: paymentMethod.billingAddress.split(',')[0]?.trim(),
          city: paymentMethod.billingAddress.split(',')[1]?.trim(),
          postal_code: paymentMethod.billingAddress.split(',')[2]?.trim(),
          country: 'US'
        } : undefined
      }
    })

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodStripe.id, {
      customer: customer.id
    })

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodStripe.id
      }
    })

    // Create subscription
    const priceId = getPriceId(plan, billingCycle)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: priceId
      }],
      default_payment_method: paymentMethodStripe.id,
      expand: ['latest_invoice.payment_intent']
    })

    // Update business record with Stripe customer ID and subscription ID
    // In a real implementation, you'd update your database here

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status
    })

  } catch (error: any) {
    console.error('❌ Stripe subscription setup error:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: `Card error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to set up subscription' },
      { status: 500 }
    )
  }
}

function getPriceId(plan: string, billingCycle: string): string {
  const priceIds: Record<string, Record<string, string>> = {
    free: {
      monthly: '',
      yearly: ''
    },
    starter: {
      monthly: 'price_starter_monthly',
      yearly: 'price_starter_yearly'
    },
    pro: {
      monthly: 'price_pro_monthly',
      yearly: 'price_pro_yearly'
    },
    enterprise: {
      monthly: 'price_enterprise_monthly',
      yearly: 'price_enterprise_yearly'
    }
  }

  return priceIds[plan]?.[billingCycle] || priceIds.starter.monthly
}