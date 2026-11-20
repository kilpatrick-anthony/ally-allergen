export const JURISDICTIONS = {
  IE: 'Republic of Ireland',
  NI: 'Northern Ireland',
  ENG: 'England',
  WAL: 'Wales',
  SCT: 'Scotland',
} as const

export type Jurisdiction = keyof typeof JURISDICTIONS

export function isJurisdiction(value: unknown): value is Jurisdiction {
  return typeof value === 'string' && Object.hasOwn(JURISDICTIONS, value)
}

export function locationAllergenGuidance(jurisdiction: Jurisdiction) {
  if (jurisdiction === 'IE') return {
    regulator: 'Food Safety Authority of Ireland',
    href: 'https://www.fsai.ie/business-advice/labelling/labelling-allergens',
    onSite: 'Customers must be able to find and read food-specific written allergen information before purchase without asking staff. A QR code alone is insufficient.',
    sign: 'Find the written allergen guide at the location shown below. You can also scan the QR code to open the guide.',
  }

  const scotland = jurisdiction === 'SCT'
  return {
    regulator: scotland ? 'Food Standards Scotland' : 'Food Standards Agency',
    href: scotland
      ? 'https://www.foodstandards.gov.scot/business-guidance/running-a-food-business/packaging-and-labelling/allergen-labelling'
      : 'https://www.gov.uk/government/publications/food-allergen-labelling-and-information-requirements-technical-guidance',
    onSite: 'For loose food, you can provide allergen information verbally before purchase when visible signs direct customers to staff. Keep up-to-date written information available.',
    sign: 'Find the written allergen guide at the location shown below, scan the QR code, or ask a member of staff before ordering.',
  }
}

export const KIOSK_BACKUP = 'Keep a current printed guide available if the kiosk or internet is unavailable. Replace printed copies whenever you publish changes.'

export const KIOSK_LOCATION_STORAGE_KEY = 'allyjen_kiosk_location'
export const LEGACY_KIOSK_STORAGE_KEY = 'allyjen_kiosk_slug'

export function locationGuidePath(businessSlug: string, siteId: string, mode?: 'web') {
  const params = new URLSearchParams({ site_id: siteId })
  if (mode) params.set('mode', mode)
  return `/kiosk/${encodeURIComponent(businessSlug)}?${params}`
}

export function publishedDate(date: string) {
  return new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Dublin' }).format(new Date(date))
}
