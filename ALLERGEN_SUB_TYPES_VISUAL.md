# Allergen Sub-Type Selection - Visual Guide

## What Changed?

### Before (Binary System)
```
Admin sees:
☑ Contains gluten (yes/no only)

Customer sees:
"Contains cereals containing gluten"
```

**Problem:** Not specific enough - does it have wheat? oats? all of them?

### After (With Sub-Types)
```
Admin sees:
◉ Contains
  ▼ Specify which grains:
  ☑ Wheat
  ☑ Oats
  ☐ Barley
  ☐ Rye
  ☐ Spelt
  ☐ Kamut

Customer sees:
"Contains wheat, oats"
```

**Solution:** Specific, accurate, legally compliant!

## Live Example Walkthrough

### Scenario: Wholegrain Bread

#### Step 1: Admin Opens Form
```
┌──────────────────────────────────────────────┐
│ Menu Item: Wholegrain Bread                 │
├──────────────────────────────────────────────┤
│ 1 Cereals containing gluten    [None] ▼     │ ← Click to expand
│ 2 Crustaceans                  [None] ▼     │
│ 3 Eggs                         [None] ▼     │
│ ...                                          │
└──────────────────────────────────────────────┘
```

#### Step 2: Expand Gluten Section
```
┌──────────────────────────────────────────────┐
│ 1 Cereals containing gluten          ▲      │
├──────────────────────────────────────────────┤
│ Select warning level:                        │
│                                              │
│ ⚪ Not Present                               │
│ ⚫ Contains                                   │ ← Select this
│ ⚪ May Contain                                │
│ ⚪ May Contain Traces                         │
│ ⚪ Not Suitable                               │
│ ⚪ Cross-Contamination Risk                   │
└──────────────────────────────────────────────┘
```

#### Step 3: Sub-Type Panel Appears! 🎯
```
┌──────────────────────────────────────────────┐
│ 1 Cereals containing gluten          ▲      │
├──────────────────────────────────────────────┤
│ ⚫ Contains ✓                                 │
├──────────────────────────────────────────────┤
│ ▼ Specify which grains    [Select All]      │
│                                              │
│ ┌──────────────┐ ┌──────────────┐          │
│ │ ☑ Wheat      │ │ ☐ Rye        │          │
│ └──────────────┘ └──────────────┘          │
│ ┌──────────────┐ ┌──────────────┐          │
│ │ ☐ Barley     │ │ ☑ Oats       │          │
│ └──────────────┘ └──────────────┘          │
│ ┌──────────────┐ ┌──────────────┐          │
│ │ ☐ Spelt      │ │ ☐ Kamut      │          │
│ └──────────────┘ └──────────────┘          │
└──────────────────────────────────────────────┘
```

#### Step 4: Summary Updates Automatically
```
┌──────────────────────────────────────────────┐
│ Allergen Summary                             │
├──────────────────────────────────────────────┤
│ 🔴 1. Cereals containing gluten              │
│     (Wheat, Oats)                            │ ← Shows specifics!
└──────────────────────────────────────────────┘
```

#### Step 5: Customer Sees on Kiosk

**Detailed View:**
```
┌──────────────────────────────────────────────┐
│ 🔴 Contains Allergens                        │
│                                              │
│ 1. Cereals containing gluten:               │
│    Contains wheat, oats                      │ ← Specific!
└──────────────────────────────────────────────┘
```

**Compact View (List):**
```
[🔴 Wheat, Oats] [🔵 Milk (traces)]
```

## Another Example: Trail Mix

### Admin Input:
```
Tree Nuts:
  ◉ Contains
  
  Specify which nuts:
  ☑ Almonds
  ☐ Hazelnuts
  ☑ Walnuts
  ☑ Cashews
  ☐ Pecans
  ☐ Brazil nuts
  ☐ Pistachios
  ☐ Macadamia
```

### Customer Output:
```
🔴 Contains Allergens
   8. Tree nuts: Contains almonds, walnuts, cashews
```

## "Select All" Feature

### Use Case: Granola with All Grains

**Admin clicks "Select All":**
```
▼ Specify which grains    [Select All] ← Click!

☑ Wheat      ☑ Rye
☑ Barley     ☑ Oats
☑ Spelt      ☑ Kamut
```

**Display to Customer:**
```
Contains cereals containing gluten
```
_(All selected = shows general name, not overwhelming list)_

## Smart Display Logic

```
if (selected.length === 0)
  → Show general name
  
if (selected.length === ALL_TYPES.length)
  → Show general name
  
if (selected.length > 0 && < ALL_TYPES.length)
  → Show "type1, type2, type3"
```

### Examples:

| Selection | Display |
|-----------|---------|
| None | "Cereals containing gluten" |
| Wheat only | "Wheat" |
| Wheat, Oats | "Wheat, oats" |
| All 6 types | "Cereals containing gluten" |

## Component Architecture

```
┌─────────────────────────────────────────────┐
│ types/allergen.ts                           │
│ • GlutenType                                │
│ • TreeNutType                               │
│ • GLUTEN_TYPES array                        │
│ • TREE_NUT_TYPES array                      │
│ • formatSubtypes() helper                   │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────────┐  ┌───────────────────────┐
│ AllergenWarning   │  │ AllergenWarning       │
│ Selector.tsx      │  │ Display.tsx           │
│                   │  │                       │
│ • Shows checkboxes│  │ • Formats for display │
│ • "Select All"    │  │ • Groups by severity  │
│ • Auto-shows panel│  │ • Compact mode        │
└───────────────────┘  └───────────────────────┘
```

## Data Flow

```
Admin Form
    ↓
  State: {
    cereals_gluten: 'contains',
    cereals_gluten_types: ['wheat', 'oats']
  }
    ↓
  Database (JSONB)
    ↓
  API Response
    ↓
  Kiosk Display
    ↓
  "Contains wheat, oats"
```

## Key Features Summary

### ✅ Auto-Detection
- Panel appears automatically when allergen level changes from "none"
- Panel hides when set back to "none"

### ✅ Visual Feedback
- Selected checkboxes highlighted in brand color
- Warning shown if no subtypes selected
- Summary shows at bottom

### ✅ User-Friendly
- "Select All" button for convenience
- Clear labels for each type
- Expandable/collapsible sections

### ✅ Backward Compatible
- Works with existing allergen data
- Optional fields (subtypes)
- Graceful fallback to general names

## Testing Instructions

1. **Open demo page** (AllergenSelectorDemo.tsx)
2. **Click "Cereals containing gluten"**
3. **Select "Contains"**
4. **Verify sub-panel appears**
5. **Check "Wheat" and "Oats"**
6. **See summary update to "(Wheat, Oats)"**
7. **Check kiosk preview shows "Contains wheat, oats"**
8. **Click "Select All"**
9. **Verify display changes to "Contains cereals containing gluten"**
10. **Set level to "Not Present"**
11. **Verify panel hides and subtypes clear**

## Database Examples

### JSONB Storage (Recommended)
```json
{
  "cereals_gluten": "contains",
  "cereals_gluten_types": ["wheat", "oats"],
  "nuts": "may_contain",
  "nuts_types": ["almonds", "cashews"],
  "milk": "traces",
  "eggs": "none",
  "fish": "none",
  ...
}
```

### Query Examples
```sql
-- Find items containing wheat
SELECT * FROM menu_items 
WHERE allergen_warnings->>'cereals_gluten' != 'none'
AND allergen_warnings->'cereals_gluten_types' ? 'wheat';

-- Find items with any tree nuts
SELECT * FROM menu_items 
WHERE allergen_warnings->>'nuts' != 'none';

-- Find items with specific nut (almonds)
SELECT * FROM menu_items 
WHERE allergen_warnings->'nuts_types' ? 'almonds';
```

---

**Implementation Status:** ✅ Complete

**Files Modified:**
- types/allergen.ts (added GlutenType, TreeNutType, arrays, formatSubtypes)
- AllergenWarningSelector.tsx (added sub-selection UI)
- AllergenWarningDisplay.tsx (added subtype formatting)

**Files Created:**
- AllergenSelectorDemo.tsx (demo/example page)
- SUB_ALLERGEN_FEATURE.md (documentation)
- ALLERGEN_SUB_TYPES_VISUAL.md (this file)
