import type { BowlSource } from '@/lib/server/bowl-guide'
import { ALLERGEN_LIST, type AllergenWarnings } from '@/types/allergen'

const clear: Partial<AllergenWarnings> = Object.fromEntries(ALLERGEN_LIST.map(({ id }) => [id, 'none']))
const { eggs: _unanswered, ...incomplete } = clear
const almondDeclaration = {
  ...clear, nuts: 'contains', nuts_levels: { almonds: 'contains' },
} satisfies Partial<AllergenWarnings>

type Ingredient = BowlSource['ingredients'][number]

function ingredient(index: number, name: string, warnings: Partial<AllergenWarnings>, variants: Ingredient['variants'] = []): Ingredient {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
  return { id, name, status: 'active', certifications: [], allergen_warnings: warnings, variants }
}

const base = ingredient(100, 'Açaí', clear)
const chocolate = ingredient(2, 'Sample chocolate cream', { ...clear, milk: 'contains' })
const chocolateBackup = ingredient(101, 'Sample backup spread', { ...clear, soybeans: 'contains' })
const chocolateAlternate = ingredient(102, 'Sample alternate spread', { ...clear, peanuts: 'may_contain' })
const whey = ingredient(23, 'Sample whey record', { ...clear, milk: 'contains' })
const peanutButter = ingredient(27, 'Peanut Butter', { ...clear, peanuts: 'contains', sesame: 'may_contain' })
const almonds = ingredient(28, 'Almonds', almondDeclaration, [
  { supplier: 'Sample supplier A', brand: null, status: 'assessed', certifications: [], warnings: { ...almondDeclaration, peanuts: 'may_contain' } },
  { supplier: 'Sample supplier B', brand: null, status: 'assessed', certifications: [], warnings: { ...almondDeclaration, sesame: 'may_contain' } },
])

// Fictional assessments for exercising the builder. The reviewed guide uses saved assessments.
const toppings = [
  ingredient(1, 'New! Oac Collagen Crumb', incomplete),
  chocolate,
  ingredient(3, 'Simple Granola', clear),
  ingredient(4, 'Nutty Crunch', clear),
  ingredient(5, 'Banana', clear),
  ingredient(6, 'Strawberries', clear),
  ingredient(7, 'Raspberries', clear),
  ingredient(8, 'Blueberries', clear),
  ingredient(9, 'Kiwi', clear),
  ingredient(10, 'Pumpkin Seeds', clear),
  ingredient(11, 'Chia Seeds', clear),
  ingredient(12, 'Sunflower Seeds', clear),
  ingredient(13, 'Goji Berries', clear),
  ingredient(14, 'Coconut Flakes', clear),
  ingredient(15, 'Cacao Nibs', clear),
  ingredient(16, 'Paçoca', clear),
  ingredient(17, 'Cashews', clear),
  ingredient(18, 'Peanuts', { ...clear, peanuts: 'contains' }),
  ingredient(19, 'Condensed Milk', clear),
  ingredient(20, 'Milk Powder', clear),
  ingredient(21, 'Natural Yogurt', clear),
  ingredient(22, 'Chia Pudding', clear),
  whey,
  ingredient(24, 'Honey', clear),
  ingredient(25, 'Pistachio Cream', clear),
  ingredient(26, 'Mango Puree', clear),
  peanutButter,
  almonds,
]

const labeledOptions = {
  [chocolate.id]: {
    id: chocolate.id,
    label: 'Hazelnut Choco Cream',
    additionalIngredientIds: [chocolateBackup.id, chocolateAlternate.id],
  },
  [whey.id]: {
    id: whey.id,
    label: 'Vanilla Whey Protein (Dry Scoop - Not Mixed into Açai)',
    additionalIngredientIds: [],
  },
}

export const previewBowlSource: BowlSource = {
  recipe: [base.id],
  ingredients: [base, ...toppings, chocolateBackup, chocolateAlternate],
  configuration: {
    fixed: [base.id],
    groups: [{
      name: 'Toppings | Unlimited',
      kind: 'multiple',
      options: toppings.map(({ id }) => labeledOptions[id] ?? id),
      defaults: [],
    }],
  },
}
