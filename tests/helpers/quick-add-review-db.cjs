const fs = require('node:fs')
const { uuid } = require('./quick-add-harness.cjs')
async function createReviewDb() {
  const { PGlite } = require(process.env.PGLITE_MODULE || '/tmp/ally-quick-add-check/node_modules/@electric-sql/pglite')
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table businesses(id uuid primary key);
    create table sites(id uuid primary key,business_id uuid references businesses(id),name text);
    create table suppliers(id uuid primary key,business_id uuid references businesses(id),name text);
    create table user_businesses(user_id uuid references auth.users(id),business_id uuid references businesses(id),role text,display_name text);
    create table ingredients(id uuid primary key default gen_random_uuid(),business_id uuid,name text,description text,category text,
      allergen_warnings jsonb,suppliers text[],certifications text[],supplier_profiles jsonb,preferred_review_months integer,status text,compliance text,created_by uuid,last_reviewed_at timestamptz);
    create table ingredient_supplier_variants(id uuid default gen_random_uuid(),business_id uuid,ingredient_id uuid references ingredients(id),supplier_id uuid references suppliers(id),
      allergen_warnings jsonb,certifications text[],assessment_status text,notes text,last_reviewed_at timestamptz,created_by uuid);
    create table menu_items(id uuid primary key default gen_random_uuid(),business_id uuid,name text,description text,category text not null,allergen_warnings jsonb,dietary text[],site_id uuid,
      is_global boolean,visibility text check(visibility in ('global','site-specific')),is_active boolean default true,item_type text,supplier_id uuid,
      ingredient_declaration text,label_verified_at timestamptz,label_verified_by uuid,last_reviewed_at timestamptz,preferred_review_months integer);
    create table datasheets(id uuid default gen_random_uuid(),business_id uuid,ingredient_id uuid references ingredients(id),menu_item_id uuid references menu_items(id),
      file_name text,file_path text,file_size bigint,file_type text,supplier_name text,next_review_date date,status text,created_by uuid);
    create table audit_log(id uuid default gen_random_uuid(),business_id uuid,entity_type text,entity_id uuid,entity_name text,action text,changes jsonb,changed_by uuid);
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text); alter table storage.objects enable row level security;
    insert into businesses values ('${uuid(1)}'),('${uuid(2)}');
    insert into auth.users values ('${uuid(3)}'),('${uuid(4)}'),('${uuid(7)}');
    insert into user_businesses values ('${uuid(3)}','${uuid(1)}','staff','Staff'),('${uuid(4)}','${uuid(1)}','manager','Manager'),('${uuid(7)}','${uuid(2)}','owner','Other owner');
    insert into sites values ('${uuid(5)}','${uuid(1)}','Kitchen'),('${uuid(8)}','${uuid(2)}','Other kitchen');
    insert into suppliers values ('${uuid(6)}','${uuid(1)}','Supplier'),('${uuid(9)}','${uuid(2)}','Other supplier');`)
  for (const file of ['20261009214320_add_quick_add_drafts.sql','20261010182555_add_quick_add_photos.sql','20261010182600_add_quick_add_review.sql']) await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'))
  await db.exec('grant select,insert,update on all tables in schema public to service_role; revoke update on quick_add_history from service_role;')
  return db
}
const allergens = ['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs']
const completeReview = () => ({ supplier_id: uuid(6),description:'Reviewed product',category:'General',allergen_warnings:Object.fromEntries(allergens.map(a=>[a,'none'])),
  preferred_review_months:12,ingredient_declaration:'Water, salt',scope:'global',site_id:null,label_checked:true,evidence_checked:true })
module.exports = { createReviewDb, completeReview, uuid }
