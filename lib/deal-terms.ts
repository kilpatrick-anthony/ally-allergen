import { getPlanDefinition, type PlanKey } from '@/lib/plans'

export const MAX_SALES_DISCOUNT_PERCENT = 50
export const QR_LITE_CONTRACT_MONTHS = 12

export interface DealTerms {
  discountPercent: number
  contractLengthMonths: number | null
  discountReason: string
}

export function getDealTerms(
  plan: PlanKey,
  input: {
    discountPercent?: unknown
    contractLengthMonths?: unknown
    discountReason?: unknown
  }
): DealTerms {
  if (plan === 'free' || plan === 'demo') {
    return { discountPercent: 0, contractLengthMonths: null, discountReason: '' }
  }

  if (plan === 'qr_lite') {
    return { discountPercent: 0, contractLengthMonths: QR_LITE_CONTRACT_MONTHS, discountReason: '' }
  }

  const discountPercent = Number(input.discountPercent ?? 0)
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > MAX_SALES_DISCOUNT_PERCENT) {
    throw new Error(`Sales discounts must be between 0% and ${MAX_SALES_DISCOUNT_PERCENT}%`)
  }

  const contractLengthMonths = Number(input.contractLengthMonths)
  if (!Number.isInteger(contractLengthMonths) || contractLengthMonths < 1) {
    throw new Error('Contract length must be a whole number of at least 1 month')
  }

  return {
    discountPercent,
    contractLengthMonths,
    discountReason: String(input.discountReason || '').trim().slice(0, 500),
  }
}

export function getDiscountedMonthlyRevenue(plan: PlanKey, discountPercent: number): number {
  const monthlyRevenue = getPlanDefinition(plan).mrrValue
  return monthlyRevenue * (1 - discountPercent / 100)
}
