export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanDefinition {
  key: PlanKey
  title: string
  monthlyPrice: number | null
  priceLabel: string
  priceSuffix: string
  mrrValue: number
  adminFeatures: string[]
}

export const SUPER_ADMIN_PLAN_ORDER: PlanKey[] = ['free', 'starter', 'pro', 'enterprise']
export const HOME_PAGE_PLAN_ORDER: PlanKey[] = ['starter', 'pro', 'enterprise']

export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: 'free',
    title: 'Free',
    monthlyPrice: 0,
    priceLabel: 'Free',
    priceSuffix: '',
    mrrValue: 0,
    adminFeatures: [
      'Internal support or goodwill accounts',
      'Customer-facing allergen kiosk and QR code',
      'Basic allergen and menu management',
      'No monthly billing',
    ],
  },
  starter: {
    key: 'starter',
    title: 'Self-Managed',
    monthlyPrice: 19.99,
    priceLabel: 'EUR 19.99',
    priceSuffix: '/month per location',
    mrrValue: 19.99,
    adminFeatures: [
      'Full AllyJen platform access',
      'Customer-facing allergen kiosk and QR code',
      'Unlimited menu items',
      'Email support',
    ],
  },
  pro: {
    key: 'pro',
    title: 'Fully Managed',
    monthlyPrice: 39.99,
    priceLabel: 'EUR 39.99',
    priceSuffix: '/month per location',
    mrrValue: 39.99,
    adminFeatures: [
      'Everything in Self-Managed',
      'Menu management by our team',
      'Priority support',
      'Proactive compliance monitoring',
    ],
  },
  enterprise: {
    key: 'enterprise',
    title: 'Enterprise',
    monthlyPrice: null,
    priceLabel: 'Contact Us',
    priceSuffix: '',
    mrrValue: 0,
    adminFeatures: [
      'Everything in Fully Managed',
      'Unlimited locations',
      'Dedicated account team',
      'Custom onboarding and rollout plan',
    ],
  },
}

export function isPlanKey(value: string | null | undefined): value is PlanKey {
  return value === 'free' || value === 'starter' || value === 'pro' || value === 'enterprise'
}

export function getPlanDefinition(plan: string | null | undefined): PlanDefinition {
  if (isPlanKey(plan)) {
    return PLAN_DEFINITIONS[plan]
  }

  return PLAN_DEFINITIONS.starter
}

export function getMonthlyRevenueForPlan(plan: string | null | undefined): number {
  return getPlanDefinition(plan).mrrValue
}
