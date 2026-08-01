// app/api/super-admin/stripe/setup-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, hasSuperAdminAccess, verifySessionToken } from '@/lib/auth'
import { getStripeClient, getStripePriceId, getStripeSetupFeePriceId, isBillingCycle } from '@/lib/stripe'
import { isPlanKey } from '@/lib/plans'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!authToken) return null

  try {
    const payload = await verifySessionToken(authToken)
    const supabase = createServiceClient()
    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail: payload.email,
      userRole: payload.role,
      userId: payload.userId,
      supabase,
    })

    if (!isSuperAdmin) return null
    return payload
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stripe = getStripeClient()
    const supabase = createServiceClient()

    const body = await request.json()
    const {
      businessId,
      plan,
      billingCycle,
      paymentMethod,
      paymentMethodId,
    } = body

    if (!businessId || !plan) {
      return NextResponse.json(
        { error: 'Business ID and plan are required' },
        { status: 400 }
      )
    }

    if (!isPlanKey(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected for Stripe setup' }, { status: 400 })
    }

    if (plan === 'free') {
      return NextResponse.json({ error: 'Free plans do not require Stripe billing' }, { status: 400 })
    }

    if (plan === 'enterprise') {
      return NextResponse.json({ error: 'Enterprise plans are contact-us only and not billed automatically' }, { status: 400 })
    }

    if (!isBillingCycle(billingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    if (!paymentMethodId && !paymentMethod) {
      return NextResponse.json(
        { error: 'A Stripe payment method or card details are required' },
        { status: 400 }
      )
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, slug, plan_type, status, settings, subscription_started_at')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: ownerLink, error: ownerLinkError } = await supabase
      .from('user_businesses')
      .select('user_id')
      .eq('business_id', businessId)
      .eq('role', 'owner')
      .maybeSingle()

    if (ownerLinkError || !ownerLink?.user_id) {
      return NextResponse.json({ error: 'No owner account is linked to this business' }, { status: 404 })
    }

    const { data: ownerUserData, error: ownerUserError } = await supabase.auth.admin.getUserById(ownerLink.user_id)
    if (ownerUserError || !ownerUserData?.user) {
      return NextResponse.json({ error: 'Failed to load business owner account' }, { status: 500 })
    }

    const currentSubscription = business.settings?.subscription || {}
    if (currentSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'This business already has a Stripe subscription recorded' },
        { status: 409 }
      )
    }

    const priceId = getStripePriceId(plan, billingCycle)
    const setupFeePriceId = getStripeSetupFeePriceId()
    const shouldChargeSetupFee =
      body?.chargeSetupFee !== false &&
      Boolean(setupFeePriceId) &&
      !currentSubscription?.setupFeeCharged

    const ownerEmail = ownerUserData.user.email || `${business.slug}@allyjen.ie`
    const ownerName = ownerUserData.user.user_metadata?.full_name || business.name
    const address = business.settings?.address || {}

    let customerId = currentSubscription?.stripeCustomerId as string | undefined
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
      } catch {
        customerId = undefined
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ownerEmail,
        name: ownerName,
        address: {
          line1: address.street || undefined,
          city: address.city || undefined,
          postal_code: address.postalCode || undefined,
          country: address.country || undefined,
        },
        metadata: {
          businessId: business.id,
          businessSlug: business.slug,
          createdByUserId: admin.userId,
        },
      })
      customerId = customer.id
    }

    let stripePaymentMethodId = paymentMethodId as string | undefined
    if (!stripePaymentMethodId) {
      stripePaymentMethodId = await createPaymentMethodFromRawCard(stripe, paymentMethod)
    }

    const attachedPaymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
    if (!('customer' in attachedPaymentMethod) || attachedPaymentMethod.customer !== customerId) {
      await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: customerId })
    }

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: stripePaymentMethodId,
      },
    })

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      ...(shouldChargeSetupFee ? { add_invoice_items: [{ price: setupFeePriceId! }] } : {}),
      default_payment_method: stripePaymentMethodId,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        businessId: business.id,
        businessSlug: business.slug,
        plan,
        billingCycle,
      },
    })

    const currentPeriodEnd = subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : null

    const nextSettings = {
      ...(business.settings || {}),
      subscription: {
        ...currentSubscription,
        plan,
        status: subscription.status,
        billingCycle,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeSetupFeePriceId: shouldChargeSetupFee ? setupFeePriceId : currentSubscription?.stripeSetupFeePriceId,
        setupFeeCharged: shouldChargeSetupFee || Boolean(currentSubscription?.setupFeeCharged),
        stripePaymentMethodId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
      },
    }

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        plan_type: plan,
        status: business.status === 'trial' ? 'active' : business.status,
        subscription_started_at: business.subscription_started_at || new Date().toISOString(),
        settings: nextSettings,
      })
      .eq('id', business.id)

    if (updateError) {
      console.error('Failed to persist Stripe subscription details:', updateError)
      return NextResponse.json(
        { error: 'Stripe subscription was created, but saving it to the business record failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId,
      setupFeeCharged: shouldChargeSetupFee,
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

async function createPaymentMethodFromRawCard(
  stripe: ReturnType<typeof getStripeClient>,
  paymentMethod: any
) {
  if (!paymentMethod?.cardNumber || !paymentMethod?.expiryMonth || !paymentMethod?.expiryYear || !paymentMethod?.cvc) {
    throw new Error('Incomplete card details provided for Stripe setup')
  }

  const country = paymentMethod?.billingCountry || 'IE'

  const created = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      number: String(paymentMethod.cardNumber).replace(/\s+/g, ''),
      exp_month: parseInt(String(paymentMethod.expiryMonth), 10),
      exp_year: parseInt(String(paymentMethod.expiryYear), 10),
      cvc: String(paymentMethod.cvc),
    },
    billing_details: {
      name: paymentMethod.billingName || undefined,
      address: paymentMethod.billingAddress
        ? {
            line1: String(paymentMethod.billingAddress).split(',')[0]?.trim(),
            city: String(paymentMethod.billingAddress).split(',')[1]?.trim(),
            postal_code: String(paymentMethod.billingAddress).split(',')[2]?.trim(),
            country,
          }
        : undefined,
    },
  })

  return created.id
}