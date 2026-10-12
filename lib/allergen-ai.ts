// lib/allergen-ai.ts
// Shared constants and helpers for AI-based allergen extraction.
// Used by /api/scan-label.

import { GLUTEN_TYPES, TREE_NUT_TYPES, type AllergenLevel, type AllergenWarnings } from '@/types/allergen'

export const VALID_ALLERGEN_IDS = [
  'cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
  'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const

export type AllergenId = typeof VALID_ALLERGEN_IDS[number]

const VALID_LEVELS = ['none', 'contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination']

function buildDefaultWarnings(): AllergenWarnings {
  return Object.fromEntries(VALID_ALLERGEN_IDS.map(id => [id, 'none'])) as unknown as AllergenWarnings
}

export function sanitiseWarnings(raw: Record<string, unknown>): AllergenWarnings {
  const result = buildDefaultWarnings()
  for (const id of VALID_ALLERGEN_IDS) {
    const val = raw[id]
    if (typeof val === 'string' && VALID_LEVELS.includes(val)) {
      (result as any)[id] = val
    }
  }
  for (const [field, subtypes] of [
    ['cereals_gluten_levels', GLUTEN_TYPES],
    ['nuts_levels', TREE_NUT_TYPES],
  ] as const) {
    const values = raw[field]
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue
    const clean: Record<string, AllergenLevel> = {}
    for (const { key } of subtypes) {
      const level = (values as Record<string, unknown>)[key]
      if (typeof level === 'string' && VALID_LEVELS.includes(level)) clean[key] = level as AllergenLevel
    }
    if (Object.keys(clean).length) (result as unknown as Record<string, unknown>)[field] = clean
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
    "cereals_gluten_levels": {
      "wheat|rye|barley|oats": "contains|may_contain|traces|cross_contamination"
    },
    "crustaceans": "none|contains|may_contain|traces|cross_contamination",
    "eggs": "none|contains|may_contain|traces|cross_contamination",
    "fish": "none|contains|may_contain|traces|cross_contamination",
    "peanuts": "none|contains|may_contain|traces|cross_contamination",
    "soybeans": "none|contains|may_contain|traces|cross_contamination",
    "milk": "none|contains|may_contain|traces|cross_contamination",
    "nuts": "none|contains|may_contain|traces|cross_contamination",
    "nuts_levels": {
      "almonds|hazelnuts|walnuts|cashews|pecans|brazil_nuts|pistachios|macadamia": "contains|may_contain|traces|cross_contamination"
    },
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

All 14 parent keys in allergen_warnings must always be present.
For cereals_gluten_levels and nuts_levels, include only subtypes explicitly named by the label. Never apply a parent level to every subtype. For example, visible wheat means cereals_gluten is contains and cereals_gluten_levels is {"wheat":"contains"}; rye, barley and oats remain omitted. Apply the same rule to explicitly named tree nuts.`
