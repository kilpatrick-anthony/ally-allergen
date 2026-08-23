alter table public.menu_items
  add column if not exists item_type text not null default 'prepared',
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists manufacturer text,
  add column if not exists product_code text,
  add column if not exists barcode text,
  add column if not exists ingredient_declaration text,
  add column if not exists label_verified_at timestamptz,
  add column if not exists label_verified_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_items_item_type_check'
      and conrelid = 'public.menu_items'::regclass
  ) then
    alter table public.menu_items
      add constraint menu_items_item_type_check
      check (item_type in ('prepared', 'packaged_product'));
  end if;
end $$;

create index if not exists menu_items_supplier_id_idx
  on public.menu_items (supplier_id);

create index if not exists datasheets_menu_item_id_idx
  on public.datasheets (menu_item_id);

comment on column public.menu_items.item_type is
  'prepared: assembled by the business; packaged_product: bought in sealed for direct resale';
comment on column public.menu_items.ingredient_declaration is
  'The ingredient declaration transcribed from the current manufacturer label';
