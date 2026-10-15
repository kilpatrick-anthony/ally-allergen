/** Keep return navigation inside the originating management list. */
export function safeListReturnPath(base: string, requested: string | null): string {
  return requested === base || requested?.startsWith(`${base}?`) ? requested : base
}

export function listContextHref(path: string, returnTo: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(returnTo)}`
}
