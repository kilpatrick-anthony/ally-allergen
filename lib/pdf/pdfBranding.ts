// lib/pdf/pdfBranding.ts — shared branding utilities for PDF generation

/** AllyJen default primary colour [r, g, b] */
export const ALLYJEN_PRIMARY: [number, number, number] = [0, 56, 66]   // #003842

/** Parse a hex colour string into [r, g, b]. Falls back to AllyJen primary on invalid input. */
export function hexToRgb(hex: string | null | undefined): [number, number, number] {
  if (!hex) return ALLYJEN_PRIMARY
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return ALLYJEN_PRIMARY
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return ALLYJEN_PRIMARY
  return [r, g, b]
}

/** Fetch a logo URL and return it as a base64 data URL usable by jsPDF.addImage. Returns null on failure. */
export async function fetchLogoAsDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(logoUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror  = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
