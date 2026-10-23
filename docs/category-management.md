# Categories and subcategories

Ingredients and Menu Builder support one optional subcategory level. Set Category to `Drinks` and Subcategory to `Milks`, `Syrups` or `Sweeteners`. Leaving Subcategory blank keeps an item directly under Drinks. Existing items stay in their current categories until edited.

Type a name or select an existing suggestion in the item form. Saving an item creates its grouping. Changing the parent clears the previous subcategory.

The pencil beside a category or subcategory heading renames that group throughout the business's corresponding collection. Renaming a parent preserves its children; renaming a child only affects that parent. Existing target names are rejected rather than merged. Staff who can save items can rename categories. Each affected item receives an audit entry. Renaming is available in grid and list views. Date sorting keeps chronological order instead of grouping items.

Admin lists, previous/next navigation, kiosk cards and allergen tables, and ingredient/menu/allergen PDFs preserve the grouping: direct items first, then subcategories alphabetically. Subcategories organize independent items; they do not change recipe ingredients or allergen calculations.

Apply `supabase/migrations/20261023134553_add_item_subcategories_and_category_renaming.sql` before deploying the application. It adds the optional fields and a server-only rename function. The server derives actor and business identity from the authenticated session. Item updates and audit entries share one transaction.

Validation:

- `node --test tests/item-categories.cjs tests/item-navigation.cjs tests/regular-assessments.cjs tests/simplified-workflow.cjs`
- Run `tests/item-categories.sql` with psql **only against an empty disposable PostgreSQL database**. It creates a minimal fixture schema, applies the migration, checks scoped renames, collisions, function permissions and rollback on audit failures, then rolls everything back.
- `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-item-categories-browser.cjs` against a local production build at `http://localhost:3111` (or set `BASE_URL`). All API responses and mutations are fixtures; no production data is changed.
