export const COOKIE_CONSENT_NAME = 'allyjen_cookie_consent'
export const COOKIE_CONSENT_VERSION = 1
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180
export const COOKIE_CONSENT_CHANGED_EVENT = 'allyjen:cookie-consent-changed'
export const COOKIE_SETTINGS_OPEN_EVENT = 'allyjen:open-cookie-settings'

export type CookieConsentPreferences = {
  version: number
  necessary: true
  analytics: boolean
  updatedAt: string
}

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof document === 'undefined') return null

  const consentCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${COOKIE_CONSENT_NAME}=`))

  if (!consentCookie) return null

  try {
    const rawValue = consentCookie.slice(COOKIE_CONSENT_NAME.length + 1)
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as Partial<CookieConsentPreferences>

    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      parsed.necessary !== true ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return null
    }

    return parsed as CookieConsentPreferences
  } catch {
    return null
  }
}

export function saveCookieConsent(analytics: boolean): CookieConsentPreferences {
  const preferences: CookieConsentPreferences = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  }

  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(JSON.stringify(preferences))}; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureAttribute}`
  window.dispatchEvent(
    new CustomEvent<CookieConsentPreferences>(COOKIE_CONSENT_CHANGED_EVENT, {
      detail: preferences,
    }),
  )

  return preferences
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true
}

export function clearGoogleAnalyticsCookies(): void {
  if (typeof document === 'undefined') return

  const cookieNames = document.cookie
    .split('; ')
    .map((cookie) => cookie.split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name.startsWith('_gat'))

  const hostnameParts = window.location.hostname.split('.')
  const registrableDomain = hostnameParts.length >= 2
    ? `.${hostnameParts.slice(-2).join('.')}`
    : null

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
    if (registrableDomain) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${registrableDomain}; SameSite=Lax`
    }
  }
}
