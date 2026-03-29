// types/allergen.ts
// Allergen warning levels and types

export type AllergenLevel = 
  | 'none'                    // No allergen present
  | 'contains'                // Definitely contains allergen
  | 'may_contain'             // May contain [allergen]
  | 'traces'                  // May contain traces of [allergen]
  | 'not_suitable'            // Not suitable for [allergen] allergy
  | 'cross_contamination';    // Produced in facility that handles [allergen]

// Sub-allergens for cereals containing gluten
export type GlutenType = 'wheat' | 'rye' | 'barley' | 'oats' | 'spelt' | 'kamut';

// Sub-allergens for tree nuts
export type TreeNutType = 'almonds' | 'hazelnuts' | 'walnuts' | 'cashews' | 'pecans' | 'brazil_nuts' | 'pistachios' | 'macadamia';

export interface AllergenWarning {
  allergen: string;
  level: AllergenLevel;
  custom_note?: string;
}

// Helper to format subtypes for display
export function formatSubtypes(allergenId: string, subtypes?: GlutenType[] | TreeNutType[]): string {
  if (!subtypes || subtypes.length === 0) {
    return ALLERGEN_LIST.find(a => a.id === allergenId)?.name.toLowerCase() || allergenId;
  }
  
  if (allergenId === 'cereals_gluten') {
    const glutenNames = (subtypes as GlutenType[]).map(t => 
      GLUTEN_TYPES.find(g => g.key === t)?.name || t
    );
    // If all types selected, use general name
    if (glutenNames.length === GLUTEN_TYPES.length) {
      return 'cereals containing gluten';
    }
    return glutenNames.join(', ').toLowerCase();
  } 
  
  if (allergenId === 'nuts') {
    const nutNames = (subtypes as TreeNutType[]).map(t => 
      TREE_NUT_TYPES.find(n => n.key === t)?.name || t
    );
    // If all types selected, use general name
    if (nutNames.length === TREE_NUT_TYPES.length) {
      return 'nuts';
    }
    return nutNames.join(', ').toLowerCase();
  }
  
  return ALLERGEN_LIST.find(a => a.id === allergenId)?.name.toLowerCase() || allergenId;
}

// Helper to get display text for allergen levels
export function getAllergenLevelText(
  level: AllergenLevel, 
  allergenName: string,
  subtypes?: GlutenType[] | TreeNutType[]
): string {
  // If subtypes provided, format them
  const displayName = subtypes ? allergenName : allergenName;
  
  switch (level) {
    case 'none':
      return '';
    case 'contains':
      return `Contains ${displayName}`;
    case 'may_contain':
      return `May contain ${displayName}`;
    case 'traces':
      return `May contain traces of ${displayName}`;
    case 'not_suitable':
      return `Not suitable for ${displayName} allergy`;
    case 'cross_contamination':
      return `Produced in a facility that handles ${displayName}`;
  }
}

// Helper to get severity level for UI styling
export function getAllergenSeverity(level: AllergenLevel): 'high' | 'medium' | 'low' | 'none' {
  switch (level) {
    case 'contains':
      return 'high';
    case 'may_contain':
    case 'not_suitable':
      return 'medium';
    case 'traces':
    case 'cross_contamination':
      return 'low';
    case 'none':
      return 'none';
  }
}

// All 14 EU allergens with colors and icons
export const ALLERGEN_LIST = [
  { id: 'cereals_gluten', name: 'Gluten', number: 1, hasSubtypes: true, color: '#f59e0b', icon: 'Wheat' },
  { id: 'crustaceans', name: 'Crustaceans', number: 2, color: '#ef4444', icon: 'Shell' },
  { id: 'eggs', name: 'Eggs', number: 3, color: '#f97316', icon: 'Egg' },
  { id: 'fish', name: 'Fish', number: 4, color: '#3b82f6', icon: 'Fish' },
  { id: 'peanuts', name: 'Peanuts', number: 5, color: '#92400e', icon: 'Bean' },
  { id: 'soybeans', name: 'Soybeans', number: 6, color: '#16a34a', icon: 'Sprout' },
  { id: 'milk', name: 'Milk', number: 7, color: '#8b5cf6', icon: 'Milk' },
  { id: 'nuts', name: 'Tree Nuts', number: 8, hasSubtypes: true, color: '#b45309', icon: 'TreeDeciduous' },
  { id: 'celery', name: 'Celery', number: 9, color: '#84cc16', icon: 'Salad' },
  { id: 'mustard', name: 'Mustard', number: 10, color: '#eab308', icon: 'Sun' },
  { id: 'sesame', name: 'Sesame seeds', number: 11, color: '#d97706', icon: 'Circle' },
  { id: 'sulphites', name: 'Sulphur dioxide and sulphites', number: 12, color: '#6366f1', icon: 'Beaker' },
  { id: 'lupin', name: 'Lupin', number: 13, color: '#ec4899', icon: 'Flower2' },
  { id: 'molluscs', name: 'Molluscs', number: 14, color: '#06b6d4', icon: 'Snail' }
] as const;

// Gluten sub-types
export const GLUTEN_TYPES: { key: GlutenType; name: string }[] = [
  { key: 'barley', name: 'Barley' },
  { key: 'oats', name: 'Oats' },
  { key: 'rye', name: 'Rye' },
  { key: 'wheat', name: 'Wheat' }
];

// Tree nut sub-types
export const TREE_NUT_TYPES: { key: TreeNutType; name: string }[] = [
  { key: 'almonds', name: 'Almonds' },
  { key: 'brazil_nuts', name: 'Brazil nuts' },
  { key: 'cashews', name: 'Cashews' },
  { key: 'hazelnuts', name: 'Hazelnuts' },
  { key: 'macadamia', name: 'Macadamia nuts' },
  { key: 'pecans', name: 'Pecans' },
  { key: 'pistachios', name: 'Pistachios' },
  { key: 'walnuts', name: 'Walnuts' }
];

export type AllergenId = typeof ALLERGEN_LIST[number]['id'];

// Allergen warnings object for menu items
export type AllergenWarnings = Record<AllergenId, AllergenLevel> & {
  // Optional subtype specifications (legacy - kept for backwards compatibility)
  cereals_gluten_types?: GlutenType[];
  nuts_types?: TreeNutType[];
  
  // Per-subtype risk levels (new - allows different levels for each grain/nut)
  cereals_gluten_levels?: Partial<Record<GlutenType, AllergenLevel>>;
  nuts_levels?: Partial<Record<TreeNutType, AllergenLevel>>;
};

// Severity order for worst-case comparison (higher index = more severe)
const LEVEL_SEVERITY: AllergenLevel[] = [
  'none',
  'cross_contamination',
  'traces',
  'may_contain',
  'not_suitable',
  'contains',
];

/**
 * Returns the more severe of two AllergenLevel values.
 * Per EU Regulation No. 1169/2011, when multiple supplier profiles exist for an
 * ingredient, the most conservative (highest severity) declaration must be shown.
 */
export function worstCaseLevel(a: AllergenLevel, b: AllergenLevel): AllergenLevel {
  const aIdx = LEVEL_SEVERITY.indexOf(a);
  const bIdx = LEVEL_SEVERITY.indexOf(b);
  return aIdx >= bIdx ? a : b;
}

/**
 * Computes the worst-case AllergenWarnings across all provided profiles.
 * Use this when a menu item is composed of multiple ingredients — each potentially
 * with different supplier allergen data — to produce the legally compliant
 * declaration per EU Regulation No. 1169/2011 (FIC Regulation).
 */
export function computeWorstCaseAllergens(profiles: AllergenWarnings[]): AllergenWarnings {
  if (profiles.length === 0) {
    return {} as AllergenWarnings;
  }

  const result: Partial<AllergenWarnings> = {};

  for (const allergen of ALLERGEN_LIST) {
    const id = allergen.id as AllergenId;
    let worst: AllergenLevel = 'none';
    for (const profile of profiles) {
      const level = (profile[id] as AllergenLevel | undefined) ?? 'none';
      worst = worstCaseLevel(worst, level);
    }
    (result as Record<string, AllergenLevel>)[id] = worst;
  }

  // Merge subtype arrays (union across all profiles)
  const allGlutenTypes = profiles.flatMap(p => p.cereals_gluten_types ?? []);
  const allNutTypes = profiles.flatMap(p => p.nuts_types ?? []);
  if (allGlutenTypes.length > 0) {
    result.cereals_gluten_types = Array.from(new Set(allGlutenTypes));
  }
  if (allNutTypes.length > 0) {
    result.nuts_types = Array.from(new Set(allNutTypes));
  }

  return result as AllergenWarnings;
}
