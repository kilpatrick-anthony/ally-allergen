import { notFound } from 'next/navigation'
import { BowlBuilder } from '@/components/kiosk/BowlBuilder'
import type { BowlGroup, BowlIngredient } from '@/lib/bowl-selection'
import { ALLERGEN_LIST } from '@/types/allergen'

export const dynamic = 'force-dynamic'

const assessed = Object.fromEntries(ALLERGEN_LIST.map(({ id }) => [id, 'none']))
const { eggs: _unanswered, ...withoutEggs } = assessed

function ingredient(
  id: string, name: string, warnings: BowlIngredient['warnings'] = {}, dietary = ['Vegan', 'Vegetarian'],
): BowlIngredient {
  return { id, name, warnings: { ...assessed, ...warnings }, dietary }
}

// Fictional assessments for validating the interaction. Production choices
// will need assessments from approved, location-specific ingredient records.
const bowl: readonly BowlGroup[] = [
  {
    name: 'Base', kind: 'required', defaults: ['acai'],
    options: [ingredient('acai', 'Açaí'), ingredient('banana', 'Banana base')],
  },
  {
    name: 'Toppings', kind: 'multiple', defaults: ['granola', 'berries'],
    options: [
      ingredient('granola', 'Almond granola', { nuts: 'contains', nuts_levels: { almonds: 'contains' } }),
      ingredient('berries', 'Mixed berries'),
      ingredient('almonds', 'Almond flakes', { nuts: 'contains', nuts_levels: { almonds: 'contains' } }),
      { id: 'crumble', name: 'Sample crumble', warnings: withoutEggs, dietary: [] },
    ],
  },
  {
    name: 'Drizzle', kind: 'optional', defaults: [],
    options: [
      ingredient('chocolate', 'Chocolate drizzle', { milk: 'contains' }, ['Vegetarian']),
      ingredient('berry', 'Berry drizzle', { nuts: 'may_contain' }),
    ],
  },
]

export default function BowlPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="min-h-screen bg-[#f4f8f7] px-4 py-8 text-[#003842] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 space-y-3">
          <p className="text-sm font-semibold">AllyJen · Maynooth pilot preview</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Build your bowl</h1>
          <p className="max-w-xl text-sm text-slate-700">This demo uses sample ingredients and allergen records. Use the venue’s current guide for food served at OAKBERRY.</p>
        </header>
        <BowlBuilder groups={bowl} />
      </div>
    </main>
  )
}
