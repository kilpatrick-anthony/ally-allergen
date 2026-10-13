alter table public.ingredient_supplier_variants
  add column if not exists brand text not null default '';

alter table public.ingredient_supplier_variants
  drop constraint if exists ingredient_supplier_variants_brand_length_check;

alter table public.ingredient_supplier_variants
  add constraint ingredient_supplier_variants_brand_length_check
  check (char_length(brand) <= 200);
