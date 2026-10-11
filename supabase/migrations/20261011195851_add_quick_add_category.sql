-- Capture the intended destination category during delivery entry. Existing
-- drafts remain valid and receive an empty category until edited.
alter table public.quick_add_drafts
  add column category text not null default ''
    check (char_length(category) <= 200);

comment on column public.quick_add_drafts.category is
  'Optional category suggested during capture and confirmed during review.';

-- The transition function owns status changes. Copy the capture suggestion into
-- a newly-created review without overriding any review already saved by a manager.
create function public.quick_add_copy_category_to_review()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if new.status = 'ready_for_review'
     and old.status = 'draft'
     and not (new.review ? 'category') then
    new.review := new.review || jsonb_build_object('category', new.category);
  end if;
  return new;
end;
$$;

create trigger quick_add_copy_category_to_review
before update of status, review on public.quick_add_drafts
for each row execute function public.quick_add_copy_category_to_review();

revoke all on function public.quick_add_copy_category_to_review() from public, anon, authenticated;
