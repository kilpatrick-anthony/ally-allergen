const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const fs = require('node:fs'), assert = require('node:assert/strict')
;(async () => {
 const db = new PGlite()
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create table public.businesses(id uuid primary key); create table public.sites(id uuid primary key); create table public.suppliers(id uuid primary key);
 create schema storage;
 create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(), bucket_id text); alter table storage.objects enable row level security;
 grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated;
 create policy broad_existing_policy on storage.objects for all to anon, authenticated using(true) with check(true);
 insert into businesses values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');`)
 for (const path of ['20261009214320_add_quick_add_drafts.sql','20261010182555_add_quick_add_photos.sql']) await db.exec(fs.readFileSync(`supabase/migrations/${path}`,'utf8'))
 await db.exec(`insert into quick_add_drafts(id,business_id,kind,name) values ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','ingredient','Bread');
 insert into storage.objects(bucket_id) values ('quick-add-photos'),('other');`)
 const photo = (n,business = 1) => `insert into quick_add_photos(id,draft_id,business_id,content_hash,byte_size) values ('00000000-0000-4000-8000-${String(n).padStart(12,'0')}','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-${String(business).padStart(12,'0')}','${'a'.repeat(64)}',100)`
 await db.exec('set role service_role')
 await assert.rejects(db.exec(photo(20,2)), /photoDraftConflict/)
 for(let n=20;n<32;n++) await db.exec(photo(n))
 await assert.rejects(db.exec(photo(32)), /photoLimit/)
 await db.exec("update quick_add_photos set state='ready' where id='00000000-0000-4000-8000-000000000020'")
 await assert.rejects(db.exec("update quick_add_photos set state='pending' where id='00000000-0000-4000-8000-000000000020'"),/photoDraftConflict/)
 await db.exec("update quick_add_photos set state='removed' where id='00000000-0000-4000-8000-000000000020'")
 await assert.rejects(db.exec("update quick_add_photos set state='ready' where id='00000000-0000-4000-8000-000000000020'"),/photoDraftConflict/)
 await db.exec(photo(32))
 await db.exec('reset role')
 for (const role of ['anon','authenticated']) {
   await db.exec(`set role ${role}`)
   await assert.rejects(db.query('select * from quick_add_photos'))
   await assert.rejects(db.exec(photo(33)))
   assert.deepEqual((await db.query('select bucket_id from storage.objects')).rows,[{bucket_id:'other'}])
   await assert.rejects(db.exec("insert into storage.objects(bucket_id) values ('quick-add-photos')"))
   await db.exec('reset role')
 }
 assert.equal((await db.query("select public from storage.buckets where id='quick-add-photos'")).rows[0].public,false)
 // Exercise the future state boundary without enabling submission in this migration.
 await db.exec("alter table quick_add_drafts drop constraint quick_add_drafts_status_check; update quick_add_drafts set status='ready_for_review'")
 await assert.rejects(db.exec("update quick_add_photos set state='ready' where state='pending'"),/photoDraftConflict/)
 console.log('PASS: private bucket, RLS (including broad-policy protection), tenant association, 12-photo limit, tombstones and draft-state guards in PostgreSQL.')
 await db.close()
})().catch(error => { console.error(error); process.exitCode=1 })
