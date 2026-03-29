// lib/allergen-ai.ts
// Shared constants and helpers for AI-based allergen extraction.
// Used by /api/scan-label.

import type { AllergenWarnings } from '@/types/allergen'

export const VALID_ALLERGEN_IDS = [
  'cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
  'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const

export type AllergenId = typeof VALID_ALLERGEN_IDS[number]

const VALID_LEVELS = ['none', 'contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination']

function buildDefaultWarnings(): AllergenWarnings {
  return Object.fromEntries(VALID_ALLERGEN_IDS.map(id => [id, 'none'])) as unknown as AllergenWarnings
}

export function sanitiseWarnings(raw: Record<string, string>): AllergenWarnings {
  const result = buildDefaultWarnings()
  for (const id of VALID_ALLERGEN_IDS) {
    const val = raw[id]
    if (val && VALID_LEVELS.includes(val)) {
      (result as any)[id] = val
    }
  }
  return result
}

// JSON schema description embedded in every AI prompt
export const ALLERGEN_JSON_SCHEMA = `Return a JSON object with EXACTLY these fields:

{
  "name": "Product or ingredient name",
  "description": "One-sentence description (empty string if unclear)",
  "allergen_warnings": {
    "cereals_gluten": "none|contains|may_contain|traces|cross_contamination",
    "crustaceans": "none|contains|may_contain|traces|cross_contamination",
    "eggs": "none|contains|may_contain|traces|cross_contamination",
    "fish": "none|contains|may_contain|traces|cross_contamination",
    "peanuts": "none|contains|may_contain|traces|cross_contamination",
    "soybeans": "none|contains|may_contain|traces|cross_contamination",
    "milk": "none|contains|may_contain|traces|cross_contamination",
    "nuts": "none|contains|may_contain|traces|cross_contamination",
    "celery": "none|contains|may_contain|traces|cross_contamination",
    "mustard": "none|contains|may_contain|traces|cross_contamination",
    "sesame": "none|contains|may_contain|traces|cross_contamination",
    "sulphites": "none|contains|may_contain|traces|cross_contamination",
    "lupin": "none|contains|may_contain|traces|cross_contamination",
    "molluscs": "none|contains|may_contain|traces|cross_contamination"
  },
  "notes": ["any caveats"]
}

Allergen level rules:
- "contains"            → listed under "Contains:" or is a core ingredient
- "may_contain"         → listed under "May contain:"
- "traces"              → "may contain traces of"
- "cross_contamination" → made on shared equipment/facility
- "none"                → not mentioned anywhere

All 14 keys in allergen_warnings must always be present.`
