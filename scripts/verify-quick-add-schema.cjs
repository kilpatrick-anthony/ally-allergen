// Optional isolated PostgreSQL check; see QUICK_ADD_DESIGN.md for the command.
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create table public.businesses(id uuid primary key);
 create table public.sites(id uuid primary key);
 create table public.suppliers(id uuid primary key);
 insert into businesses values ('00000000-0000-4000-8000-000000000001');
 insert into auth.users values ('00000000-0000-4000-8000-000000000002');`);
 await db.exec(fs.readFileSync(require('node:path').join(__dirname, '../supabase/migrations/20261009214320_add_quick_add_drafts.sql'),'utf8'));
 await db.exec(`set role service_role; insert into quick_add_drafts(business_id,kind,name,created_by) values ('00000000-0000-4000-8000-000000000001','ingredient','Delivery bread','00000000-0000-4000-8000-000000000002')`);
 let result = await db.query('select status,version from quick_add_drafts');
 assert.deepEqual(result.rows,[{status:'draft',version:1}]);
 await assert.rejects(db.exec("update quick_add_drafts set status='approved'"));
 await assert.rejects(db.exec("update quick_add_drafts set name=' '"));
 await assert.rejects(db.exec("update quick_add_drafts set site_id='00000000-0000-4000-8000-000000000099'"));
 await db.exec('reset role');
 for (const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select * from quick_add_drafts'));
  await assert.rejects(db.exec("insert into quick_add_drafts(business_id,kind,name) values ('00000000-0000-4000-8000-000000000001','ingredient','Hidden')"));
  await db.exec('reset role');
 }
 assert.equal((await db.query("select relrowsecurity from pg_class where oid='quick_add_drafts'::regclass")).rows[0].relrowsecurity,true);
 console.log('PASS: migration executes; draft defaults, constraints, foreign keys, RLS and private grants verified in isolated PostgreSQL (PGlite).');
 await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});
