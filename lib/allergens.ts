// lib/allergens.ts - Allergen configuration and utilities

import {
  Wheat, Fish, Egg, Milk, Shell, Bean, Salad, Sprout, 
  Circle, Leaf, Beaker, Sun, Flower2, TreeDeciduous, Snail,
  Apple, WheatOff, Moon, Star, Globe, Droplets, ShieldCheck, Target,
  type LucideIcon
} from 'lucide-react'

export type AllergenInfo = {
  id: string
  name: string
  shortName?: string
  icon: LucideIcon
  color: string
  bgColor: string
}

// EU 14 Allergen List (Official Order) - Matching admin design
export const ALLERGENS: AllergenInfo[] = [
  {
    id: 'cereals_gluten',
    name: 'Gluten',
    shortName: 'Gluten',
    icon: Wheat,
    color: 'bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b40]',
    bgColor: '#f59e0b'
  },
  {
    id: 'crustaceans',
    name: 'Crustaceans',
    shortName: 'Crustaceans',
    icon: Shell,
    color: 'bg-[#ef444415] text-[#ef4444] border border-[#ef444440]',
    bgColor: '#ef4444'
  },
  {
    id: 'eggs',
    name: 'Eggs',
    shortName: 'Eggs',
    icon: Egg,
    color: 'bg-[#f9731615] text-[#f97316] border border-[#f9731640]',
    bgColor: '#f97316'
  },
  {
    id: 'fish',
    name: 'Fish',
    shortName: 'Fish',
    icon: Fish,
    color: 'bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f640]',
    bgColor: '#3b82f6'
  },
  {
    id: 'peanuts',
    name: 'Peanuts',
    shortName: 'Peanuts',
    icon: Bean,
    color: 'bg-[#92400e15] text-[#92400e] border border-[#92400e40]',
    bgColor: '#92400e'
  },
  {
    id: 'soybeans',
    name: 'Soybeans',
    shortName: 'Soy',
    icon: Sprout,
    color: 'bg-[#16a34a15] text-[#16a34a] border border-[#16a34a40]',
    bgColor: '#16a34a'
  },
  {
    id: 'milk',
    name: 'Milk',
    shortName: 'Dairy',
    icon: Milk,
    color: 'bg-[#8b5cf615] text-[#8b5cf6] border border-[#8b5cf640]',
    bgColor: '#8b5cf6'
  },
  {
    id: 'nuts',
    name: 'Tree Nuts',
    shortName: 'Tree Nuts',
    icon: TreeDeciduous,
    color: 'bg-[#b4530915] text-[#b45309] border border-[#b4530940]',
    bgColor: '#b45309'
  },
  {
    id: 'celery',
    name: 'Celery',
    shortName: 'Celery',
    icon: Salad,
    color: 'bg-[#84cc1615] text-[#84cc16] border border-[#84cc1640]',
    bgColor: '#84cc16'
  },
  {
    id: 'mustard',
    name: 'Mustard',
    shortName: 'Mustard',
    icon: Sun,
    color: 'bg-[#eab30815] text-[#eab308] border border-[#eab30840]',
    bgColor: '#eab308'
  },
  {
    id: 'sesame',
    name: 'Sesame',
    shortName: 'Sesame',
    icon: Circle,
    color: 'bg-[#d9730015] text-[#d97300] border border-[#d9730040]',
    bgColor: '#d97300'
  },
  {
    id: 'sulphites',
    name: 'Sulphites',
    shortName: 'Sulphites',
    icon: Beaker,
    color: 'bg-[#a855f715] text-[#a855f7] border border-[#a855f740]',
    bgColor: '#a855f7'
  },
  {
    id: 'lupin',
    name: 'Lupin',
    shortName: 'Lupin',
    icon: Flower2,
    color: 'bg-[#6366f115] text-[#6366f1] border border-[#6366f140]',
    bgColor: '#6366f1'
  },
  {
    id: 'molluscs',
    name: 'Molluscs',
    shortName: 'Molluscs',
    icon: Snail,
    color: 'bg-[#14b8a615] text-[#14b8a6] border border-[#14b8a640]',
    bgColor: '#14b8a6'
  }
]

// Helper to get allergens present in an item (legacy boolean system)
export function getAllergensForItem(item: any): string[] {
  return ALLERGENS
    .filter(allergen => item[allergen.id] === true)
    .map(allergen => allergen.name)
}

// Helper to find allergen info by ID
export function getAllergenById(id: string): AllergenInfo | undefined {
  return ALLERGENS.find(a => a.id === id)
}

export interface LabelIconMatch {
  icon: LucideIcon
  color: string
}

// Keyword groups used to match free-text search/filter labels (which may not
// be exact allergen IDs) to the same icon/colour used elsewhere in the app.
// Order matters: more specific keywords (e.g. "peanut") must be checked
// before broader ones (e.g. "nut") that would otherwise match as a substring.
const ALLERGEN_LABEL_ICONS: { keywords: string[]; icon: LucideIcon; color: string }[] = [
  { keywords: ['peanut'], icon: Bean, color: '#92400e' },
  { keywords: ['tree nut', 'nut'], icon: TreeDeciduous, color: '#b45309' },
  { keywords: ['milk', 'dairy', 'lactose'], icon: Milk, color: '#8b5cf6' },
  { keywords: ['egg'], icon: Egg, color: '#f97316' },
  { keywords: ['shellfish', 'crustacean'], icon: Shell, color: '#ef4444' },
  { keywords: ['fish'], icon: Fish, color: '#3b82f6' },
  { keywords: ['sesame'], icon: Circle, color: '#d97300' },
  { keywords: ['soy'], icon: Sprout, color: '#16a34a' },
  { keywords: ['gluten', 'wheat', 'barley', 'rye', 'oat', 'cereal'], icon: Wheat, color: '#f59e0b' },
  { keywords: ['mustard'], icon: Sun, color: '#eab308' },
  { keywords: ['celery'], icon: Salad, color: '#84cc16' },
  { keywords: ['sulphite', 'sulfite'], icon: Beaker, color: '#a855f7' },
  { keywords: ['lupin'], icon: Flower2, color: '#6366f1' },
  { keywords: ['mollusc', 'mollusk'], icon: Snail, color: '#14b8a6' },
]

/** Matches a free-text allergen search/filter label to its icon and colour. */
export function getAllergenIconForLabel(label: string): LabelIconMatch {
  const lower = (label || '').toLowerCase()
  for (const entry of ALLERGEN_LABEL_ICONS) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return { icon: entry.icon, color: entry.color }
    }
  }
  return { icon: Target, color: '#dc2626' }
}

// Must match the dietary options shown on the kiosk (app/kiosk/[slug]/page.tsx).
const DIETARY_LABEL_ICONS: { keywords: string[]; icon: LucideIcon; color: string }[] = [
  { keywords: ['vegan'], icon: Leaf, color: '#16a34a' },
  { keywords: ['vegetarian'], icon: Apple, color: '#84cc16' },
  { keywords: ['gluten'], icon: WheatOff, color: '#f59e0b' },
  { keywords: ['halal'], icon: Moon, color: '#10b981' },
  { keywords: ['kosher'], icon: Star, color: '#3b82f6' },
  { keywords: ['organic'], icon: Sprout, color: '#22c55e' },
  { keywords: ['fair trade'], icon: Globe, color: '#8b5cf6' },
  { keywords: ['lactose', 'dairy'], icon: Droplets, color: '#06b6d4' },
  { keywords: ['coeliac', 'celiac'], icon: ShieldCheck, color: '#ec4899' },
]

/** Matches a free-text dietary filter label to its icon and colour. */
export function getDietaryIconForLabel(label: string): LabelIconMatch {
  const lower = (label || '').toLowerCase()
  for (const entry of DIETARY_LABEL_ICONS) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return { icon: entry.icon, color: entry.color }
    }
  }
  return { icon: Leaf, color: '#16a34a' }
}
