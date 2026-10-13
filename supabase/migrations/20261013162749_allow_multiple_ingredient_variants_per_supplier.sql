alter table public.ingredient_supplier_variants
  drop constraint if exists ingredient_supplier_variants_unique;

create index if not exists ingredient_supplier_variants_ingredient_supplier_idx
  on public.ingredient_supplier_variants (ingredient_id, supplier_id);
