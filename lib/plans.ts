export type PlanKey = 'free' | 'demo' | 'qr_lite' | 'starter' | 'pro' | 'enterprise'

export interface PlanDefinition {
  key: PlanKey
  title: string
  monthlyPrice: number | null
  priceLabel: string
  priceSuffix: string
  mrrValue: number
  adminFeatures: string[]
}

export const SUPER_ADMIN_PLAN_ORDER: PlanKey[] = ['free', 'demo', 'qr_lite', 'starter', 'pro', 'enterprise']
export const HOME_PAGE_PLAN_ORDER: PlanKey[] = ['qr_lite', 'starter', 'pro', 'enterprise']

export const EARLY_ADOPTER_TERMS = 'Available to the first 10 new paying locations or until 30 November 2026, whichever comes first. Pay yearly, with no obligation to renew. Your annual price is protected for three years while your subscription remains active.'

export const EARLY_ADOPTER_ADMIN_SUMMARY = '€99 per location per year, paid yearly. ' + EARLY_ADOPTER_TERMS

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
  demo: {
    key: 'demo',
    title: 'Demo',
    monthlyPrice: 0,
    priceLabel: 'Demo',
    priceSuffix: '',
    mrrValue: 0,
    adminFeatures: [
      'Demo and sales walkthrough accounts',
      'Customer-facing allergen kiosk and QR code',
      'Sample data for training and demonstrations',
      'No monthly billing',
    ],
  },
  qr_lite: {
    key: 'qr_lite',
    title: 'Early Adopter',
    monthlyPrice: 99 / 12,
    priceLabel: 'EUR 99',
    priceSuffix: '/location per year',
    mrrValue: 99 / 12,
    adminFeatures: [
      'AllyJen QR Lite access',
      '€99 per location per year, paid yearly',
      'Annual price protected for three years while your subscription remains active',
      'No obligation to renew',
      'QR signage and help setting up your existing allergen information',
      'Customers access your allergen guide on their own phone',
      'Update your information as your menu changes',
      'No tablet or kiosk needed',
      'First 10 new paying locations or until 30 November 2026, whichever comes first',
    ],
  },
  starter: {
    key: 'starter',
    title: 'Self-Managed',
    monthlyPrice: 39.99,
    priceLabel: 'EUR 39.99',
    priceSuffix: '/month per location',
    mrrValue: 39.99,
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
    monthlyPrice: 79.99,
    priceLabel: 'EUR 79.99',
    priceSuffix: '/month per location',
    mrrValue: 79.99,
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
  return value === 'free' || value === 'demo' || value === 'qr_lite' || value === 'starter' || value === 'pro' || value === 'enterprise'
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
