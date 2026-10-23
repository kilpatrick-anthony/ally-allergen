-- Run only against an empty disposable PostgreSQL database: psql -v ON_ERROR_STOP=1 -f tests/item-categories.sql
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.ingredients (id uuid PRIMARY KEY, business_id uuid NOT NULL, name text NOT NULL, category text, updated_at timestamptz DEFAULT now());
CREATE TABLE public.menu_items (LIKE public.ingredients INCLUDING ALL);
CREATE TABLE public.user_businesses (business_id uuid, user_id uuid, role text, display_name text);
CREATE TABLE public.audit_log (business_id uuid,entity_type text,entity_id uuid,entity_name text,action text,changes jsonb,changed_by uuid,changed_by_email text,changed_by_name text);

\ir ../supabase/migrations/20261023134553_add_item_subcategories_and_category_renaming.sql
INSERT INTO user_businesses VALUES ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff','Rio staff');
INSERT INTO menu_items(id,business_id,name,category,subcategory) VALUES
('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Coffee','Drinks',''),
('00000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Oat milk','Drinks','Milks'),
('00000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Vanilla','Drinks','Syrups'),
('00000000-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','Other coffee','Drinks','Milks'),
('00000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Food','Food','Milks');
DO $$ DECLARE n integer; BEGIN
 n:=rename_item_category('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff@example.invalid','menu-items','Drinks',NULL,'Beverages');
 ASSERT n=3;
 ASSERT (SELECT count(*)=3 FROM menu_items WHERE category='Beverages');
 ASSERT (SELECT subcategory='Milks' FROM menu_items WHERE name='Oat milk');
 ASSERT (SELECT category='Drinks' FROM menu_items WHERE name='Other coffee');
 ASSERT (SELECT count(*)=3 FROM audit_log WHERE changed_by_name='Rio staff');
 n:=rename_item_category('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',NULL,'menu-items','Beverages','Milks','Milk options');
 ASSERT n=1;
 ASSERT (SELECT subcategory='Milks' FROM menu_items WHERE name='Food');
 BEGIN
  PERFORM rename_item_category('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',NULL,'menu-items','Beverages',NULL,'food');
  RAISE EXCEPTION 'Collision accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM rename_item_category('22222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',NULL,'menu-items','Drinks',NULL,'Stolen');
  RAISE EXCEPTION 'Foreign business accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO ingredients(id,business_id,name,category,subcategory) VALUES ('00000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Bad','','Child');
  RAISE EXCEPTION 'Missing parent accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 ASSERT NOT has_function_privilege('anon','rename_item_category(uuid,uuid,text,text,text,text,text)','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','rename_item_category(uuid,uuid,text,text,text,text,text)','EXECUTE');
 ASSERT has_function_privilege('service_role','rename_item_category(uuid,uuid,text,text,text,text,text)','EXECUTE');
END $$;
-- Prove update and audit insert share a transaction: forced audit failure leaves no changed names.
ALTER TABLE audit_log ADD CONSTRAINT reject_test CHECK (entity_name <> 'Coffee') NOT VALID;
DO $$ BEGIN
 BEGIN
  PERFORM rename_item_category('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',NULL,'menu-items','Beverages',NULL,'Rejected');
  RAISE EXCEPTION 'Audit failure accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 ASSERT (SELECT count(*)=3 FROM menu_items WHERE category='Beverages');
 ASSERT (SELECT count(*)=4 FROM audit_log);
END $$;
ROLLBACK;
