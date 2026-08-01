import Stripe from 'stripe'
import { isPlanKey, type PlanKey } from '@/lib/plans'

export type BillingCycle = 'monthly' | 'yearly'

const PRICE_ENV_MAP: Record<Exclude<PlanKey, 'free'>, Record<BillingCycle, string | undefined>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_1TzhE70zJJbcSAh0KtwFIhXR',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_1TzhFS0zJJbcSAh0ceOONlzu',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  },
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Stripe is not configured yet: missing STRIPE_SECRET_KEY')
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  })
}

export function isBillingCycle(value: string | null | undefined): value is BillingCycle {
  return value === 'monthly' || value === 'yearly'
}

export function getStripePriceId(plan: string, billingCycle: string) {
  if (!isPlanKey(plan)) {
    throw new Error('Invalid plan for Stripe subscription')
  }

  if (plan === 'free') {
    throw new Error('Free plans do not require a Stripe subscription')
  }

  if (plan === 'enterprise') {
    throw new Error('Enterprise is handled as Contact Us and is not billed automatically')
  }

  if (!isBillingCycle(billingCycle)) {
    throw new Error('Invalid billing cycle for Stripe subscription')
  }

  const priceId = PRICE_ENV_MAP[plan][billingCycle]
  if (!priceId) {
    throw new Error(`Stripe price ID is not configured for ${plan} (${billingCycle})`)
  }

  return priceId
}

export function getStripeSetupFeePriceId() {
  return process.env.STRIPE_PRICE_SETUP_FEE
}

