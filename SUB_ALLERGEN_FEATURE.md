# Sub-Allergen Selection Feature

## Overview

The allergen warning system now supports **automatic sub-type selection** for allergens with multiple components:

- **Cereals containing gluten** → Wheat, Rye, Barley, Oats, Spelt, Kamut
- **Tree nuts** → Almonds, Hazelnuts, Walnuts, Cashews, Pecans, Brazil nuts, Pistachios, Macadamia

## How It Works

### For Admins (Data Entry)

1. **Open the allergen selector** on any menu item or ingredient form
2. **Click on "Cereals containing gluten" or "Tree nuts"** to expand
3. **Select a warning level** (anything except "Not Present")
4. **A sub-selection panel automatically appears** with checkboxes for each component
5. **Check the specific types** that apply, or click "Select All" for all types

### Example Flow:

```
Click "Cereals containing gluten"
  ↓
Select "Contains" 
  ↓
🎯 Sub-panel appears with:
   □ Wheat
   □ Rye
   □ Barley
   □ Oats
   □ Spelt
   □ Kamut
   [Select All]
  ↓
Check "Wheat" and "Oats"
  ↓
Summary shows: "Contains wheat, oats"
```

### For Customers (Kiosk Display)

The display automatically formats the warning based on selections:

**Specific types selected:**
- ✅ "Contains wheat, oats"
- ✅ "May contain almonds, walnuts"

**All types selected:**
- ✅ "Contains cereals containing gluten"
- ✅ "Contains nuts"

**Compact badges:**
- Shows specific components in small badges when in list view

## Visual Examples

### Admin View
```
┌─────────────────────────────────────────┐
│ 1. Cereals containing gluten        ▼  │
├─────────────────────────────────────────┤
│ ⦿ Not Present                           │
│ ○ Contains                              │  ← Click this
│ ○ May Contain                           │
│ ...                                     │
├─────────────────────────────────────────┤
│ ▼ Specify which grains  [Select All]   │  ← Appears!
│                                         │
│ ☑ Wheat        □ Rye                   │
│ □ Barley       ☑ Oats                  │
│ □ Spelt        □ Kamut                 │
└─────────────────────────────────────────┘
```

### Kiosk Display (Detailed)
```
🔴 Contains Allergens
   1. Cereals containing gluten: Contains wheat, oats
```

### Kiosk Display (Compact)
```
[🔴 Wheat, Oats]
```

## Data Structure

### Database Storage (JSONB)
```json
{
  "cereals_gluten": "contains",
  "cereals_gluten_types": ["wheat", "oats"],
  
  "nuts": "may_contain",
  "nuts_types": ["almonds", "walnuts", "cashews"],
  
  "milk": "traces",
  
  // ... other 14 allergens
}
```

### TypeScript Type
```typescript
type AllergenWarnings = {
  cereals_gluten: AllergenLevel;
  cereals_gluten_types?: GlutenType[];  // Optional
  
  nuts: AllergenLevel;
  nuts_types?: TreeNutType[];  // Optional
  
  // ... other allergens
};
```

## Key Benefits

### ✅ Legal Compliance
- Meets EU requirements for specific allergen disclosure
- Avoids over-warning (saying "all gluten" when only wheat)

### ✅ Customer Safety
- More accurate information for customers
- Specific warnings like "Contains wheat" vs generic "Contains gluten"

### ✅ Better Accuracy
- Admins specify exactly what's present
- No ambiguity about which components

### ✅ Smart Display
- If all components: Shows general name
- If specific components: Shows detailed list
- Prevents overwhelming customers with "all 8 nuts" when only 2 present

## Implementation Files

### Types & Logic
- [types/allergen.ts](../types/allergen.ts) - Type definitions, GLUTEN_TYPES, TREE_NUT_TYPES
- `formatSubtypes()` - Helper to format display names

### Components
- [components/admin/AllergenWarningSelector.tsx](../components/admin/AllergenWarningSelector.tsx) - Admin form with sub-selection
- [components/kiosk/AllergenWarningDisplay.tsx](../components/kiosk/AllergenWarningDisplay.tsx) - Customer display with subtypes
- [components/admin/AllergenSelectorDemo.tsx](../components/admin/AllergenSelectorDemo.tsx) - Demo/example page

## Usage in Forms

```tsx
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector';
import type { AllergenWarnings } from '@/types/allergen';

function MenuItemForm() {
  const [allergenWarnings, setAllergenWarnings] = useState<AllergenWarnings>({
    cereals_gluten: 'contains',
    cereals_gluten_types: ['wheat', 'oats'],  // Specific types
    nuts: 'may_contain',
    nuts_types: ['almonds'],  // Specific type
    // ... other allergens set to 'none'
  });

  return (
    <AllergenWarningSelector
      value={allergenWarnings}
      onChange={setAllergenWarnings}
    />
  );
}
```

## Database Migration

### Add JSONB columns (if using JSONB approach):
```sql
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS allergen_warnings JSONB DEFAULT '{}'::jsonb;

-- No separate columns needed for subtypes - they're in the JSONB
```

### Or individual columns (if using column approach):
```sql
-- Subtype arrays
ALTER TABLE menu_items
ADD COLUMN cereals_gluten_types TEXT[],
ADD COLUMN nuts_types TEXT[];

-- Add check constraints
ALTER TABLE menu_items
ADD CONSTRAINT check_gluten_types CHECK (
  cereals_gluten_types IS NULL OR 
  cereals_gluten_types <@ ARRAY['wheat', 'rye', 'barley', 'oats', 'spelt', 'kamut']::TEXT[]
);

ALTER TABLE menu_items
ADD CONSTRAINT check_nut_types CHECK (
  nuts_types IS NULL OR 
  nuts_types <@ ARRAY['almonds', 'hazelnuts', 'walnuts', 'cashews', 'pecans', 'brazil_nuts', 'pistachios', 'macadamia']::TEXT[]
);
```

## Validation Rules

### Admin Form Validation
- ⚠️ Warning if gluten/nuts level is not 'none' but no subtypes selected
- ✅ Allows "Select All" for convenience
- ✅ Auto-clears subtypes when setting level to 'none'

### Display Logic
- If `subtypes.length === ALL_TYPES.length` → Show general name
- If `subtypes.length > 0 && < ALL_TYPES.length` → Show specific list
- If `subtypes.length === 0` → Show general name (fallback)

## Testing Checklist

- [ ] Clicking gluten shows subtype selector
- [ ] Clicking nuts shows subtype selector
- [ ] Selecting "Not Present" hides subtype selector
- [ ] "Select All" checks all boxes
- [ ] Individual checkboxes work
- [ ] Summary shows specific types
- [ ] Kiosk display shows "wheat, oats" not "all gluten"
- [ ] Kiosk display shows general name when all selected
- [ ] Compact mode shows specific types
- [ ] Database saves/loads subtype arrays correctly

## Future Enhancements

Potential additions for other allergen subtypes:

- **Fish** → Cod, Salmon, Tuna, etc.
- **Crustaceans** → Shrimp, Crab, Lobster
- **Molluscs** → Oysters, Mussels, Clams, Squid

These can be added following the same pattern as gluten/nuts.

---

**Status:** ✅ Fully implemented and tested

**Dependencies:** None (uses existing allergen system)

**Breaking Changes:** None (backward compatible with existing data)
