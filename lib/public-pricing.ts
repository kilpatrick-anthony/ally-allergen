export const PUBLIC_MARKETS = {
  ireland: { label: 'Ireland/EU €', currency: 'EUR', symbol: '€' },
  uk: { label: 'UK £', currency: 'GBP', symbol: '£' },
} as const

export type PublicMarket = keyof typeof PUBLIC_MARKETS

export const PUBLIC_OFFERS = {
  qr_lite: { name: 'QR Lite', cadence: 'year', minor: { ireland: 9900, uk: 8300 } },
  starter: { name: 'Self-Managed', cadence: 'month', minor: { ireland: 1999, uk: 1700 } },
  pro: { name: 'Fully Managed', cadence: 'month', minor: { ireland: 5999, uk: 5000 } },
  kiosk: { name: 'Kiosk tablet', cadence: 'one-off', minor: { ireland: 29900, uk: 25000 } },
} as const

type PublicOffer = keyof typeof PUBLIC_OFFERS
export type PublicEnquiry = PublicOffer | 'group' | ''

export function isPublicMarket(value: unknown): value is PublicMarket {
  return typeof value === 'string' && Object.hasOwn(PUBLIC_MARKETS, value)
}

export function isPublicEnquiry(value: unknown): value is PublicEnquiry {
  return typeof value === 'string' && (value === '' || value === 'group' || Object.hasOwn(PUBLIC_OFFERS, value))
}

export function publicPrice(offer: PublicOffer, market: PublicMarket) {
  const amount = PUBLIC_OFFERS[offer].minor[market]
  return PUBLIC_MARKETS[market].symbol + (amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)
}

export function publicEnquiryLabel(enquiry: PublicEnquiry, market: PublicMarket) {
  if (enquiry === '') return 'General enquiry'
  if (enquiry === 'group') return 'Group pricing'
  const offer = PUBLIC_OFFERS[enquiry]
  const price = publicPrice(enquiry, market)
  return offer.cadence === 'one-off'
    ? `${offer.name} — ${price} one-off purchase`
    : `${offer.name} — ${price}/${offer.cadence} Early Adopter Offer`
}
