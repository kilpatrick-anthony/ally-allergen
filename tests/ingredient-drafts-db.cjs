const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { createReviewDb, completeReview, uuid } = require('./helpers/quick-add-review-db.cjs')
const migration = 'supabase/migrations/20261016083316_add_regular_ingredient_drafts.sql'
const payload = () => ({ name: 'Draft oats', description: '', category: '', suppliers: [], certifications: [], supplier_profiles: {}, allergen_warnings: {}, preferred_review_months: 12 })
async function fixture() {
  const db = await createReviewDb()
  await db.exec(`alter table ingredient_supplier_variants add column brand text; alter table suppliers add column created_by uuid; alter table suppliers alter column id set default gen_random_uuid();
    alter table datasheets add column version text; alter table datasheets add column notes text;`)
  await db.exec(fs.readFileSync(migration, 'utf8'))
  return db
}
const save = (db, id, version, data = payload(), business = uuid(1), actor = uuid(3)) => db.query('select public.save_regular_ingredient_draft($1,$2,$3,$4,$5::jsonb) as draft', [id, business, actor, version, JSON.stringify(data)]).then(result => ({ rows: result.rows.map(row => row.draft) }))
const activate = (db, id, version, data, business = uuid(1), actor = uuid(3)) => db.query('select public.activate_regular_ingredient_draft($1,$2,$3,$4,$5::jsonb) as id', [id, business, actor, version, JSON.stringify(data)])
const all = async (db, table) => (await db.query(`select * from ${table}`)).rows

test('draft persistence is isolated; lost responses are idempotent and stale edits conflict', async () => {
  const db = await fixture()
  try {
    const original = payload()
    assert.equal((await save(db, uuid(20), 0, original)).rows[0].version, 1)
    assert.equal((await save(db, uuid(20), 0, original)).rows[0].version, 1)
    for (const table of ['ingredients', 'ingredient_supplier_variants', 'datasheets', 'audit_log', 'menu_item_ingredients']) assert.equal((await all(db, table)).length, 0)
    const changed = { ...original, description: 'Updated by colleague' }
    assert.equal((await save(db, uuid(20), 1, changed)).rows[0].version, 2)
    await assert.rejects(save(db, uuid(20), 1, { ...original, name: 'Stale change' }), /draftConflict/)
    assert.equal((await save(db, uuid(20), 1, changed)).rows[0].version, 2)
    assert.deepEqual((await all(db, 'ingredient_drafts'))[0].payload, changed)
    await assert.rejects(save(db, uuid(20), 2, original, uuid(2), uuid(7)), /draftNotFound/)
    await assert.rejects(save(db, uuid(21), 0, original, uuid(1), uuid(7)), /draftForbidden/)
    await assert.rejects(activate(db, uuid(20), 2, original), /completeIngredient/)
    assert.equal((await all(db, 'ingredients')).length, 0)
  } finally { await db.close() }
})

test('activation atomically creates inventory, variants, evidence and audit; retries return one ingredient', async () => {
  const db = await fixture()
  try {
    await db.exec('set role service_role')
    const data = { ...payload(), allergen_warnings: completeReview().allergen_warnings, suppliers: ['Supplier'], supplier_profiles: {
      brandOne: { supplier_name: 'Supplier', brand: 'One', allergen_warnings: completeReview().allergen_warnings, certifications: [], assessment_status: 'assessed' },
      brandTwo: { supplier_name: 'Supplier', brand: 'Two', allergen_warnings: completeReview().allergen_warnings, certifications: [], assessment_status: 'assessed' },
    } }
    await save(db, uuid(20), 0, data)
    await db.query(`insert into ingredient_draft_documents(id,draft_id,business_id,storage_path,file_name,file_size,file_type) values($1,$2,$3,'private/path','evidence.pdf',10,'application/pdf')`,[uuid(30),uuid(20),uuid(1)])
    assert.equal((await all(db,'datasheets')).length,0)
    await assert.rejects(activate(db, uuid(20), 2, data), /draftConflict/)
    const result = await activate(db, uuid(20), 1, data)
    assert.equal((await activate(db, uuid(20), 1, data)).rows[0].id, result.rows[0].id)
    assert.equal((await all(db, 'ingredients')).length, 1)
    assert.equal((await all(db, 'ingredient_supplier_variants')).length, 2)
    const ingredient = (await all(db,'ingredients'))[0]
    assert.equal(ingredient.status,'active')
    assert.equal(ingredient.supplier_profiles.brandOne.supplier_id,uuid(6))
    const docs = await all(db,'datasheets')
    assert.equal(docs.length,1)
    assert.equal(docs[0].ingredient_id,ingredient.id)
    assert.equal(docs[0].file_path,`/api/ingredient-draft-documents/${uuid(30)}`)
    assert.equal((await all(db,'audit_log')).length,1)
    await assert.rejects(db.query('update ingredient_draft_documents set notes=$1 where id=$2',['late edit',uuid(30)]),/draftConflict/)
    await assert.rejects(db.query('delete from ingredient_draft_documents where id=$1',[uuid(30)]),/draftConflict/)
    assert.equal((await save(db,uuid(20),1,{...data,name:'Late edit'})).rows[0].ingredient_id,ingredient.id)
    await assert.rejects(activate(db,uuid(20),1,data,uuid(2),uuid(7)),/draftNotFound/)
  } finally { await db.close() }
})

test('a promotion failure rolls back every inventory write and leaves the draft editable', async () => {
  const db = await fixture()
  try {
    const data = { ...payload(), allergen_warnings: completeReview().allergen_warnings, suppliers: ['New supplier'], supplier_profiles: { new: { supplier_name: 'New supplier', allergen_warnings: completeReview().allergen_warnings, certifications: [], assessment_status: 'assessed' } } }
    await save(db,uuid(20),0,data)
    await db.exec(`alter table ingredient_supplier_variants add constraint simulate_failure check (brand = 'unreachable');`)
    await assert.rejects(activate(db,uuid(20),1,data),/simulate_failure/)
    for (const table of ['ingredients','ingredient_supplier_variants','datasheets','audit_log']) assert.equal((await all(db,table)).length,0)
    assert.equal((await all(db,'suppliers')).length,2)
    const draft = (await all(db,'ingredient_drafts'))[0]
    assert.equal(draft.ingredient_id,null); assert.equal(draft.version,1)
    assert.equal((await save(db,uuid(20),1,{...data,name:'Recovered'})).rows[0].version,2)
  } finally { await db.close() }
})

test('database roles, RLS, evidence ownership and revoked memberships fail closed', async () => {
  const db = await fixture()
  try {
    await save(db,uuid(20),0)
    assert.equal((await db.query("select public from storage.buckets where id='ingredient-draft-documents'")).rows[0].public,false)
    const rls = await db.query("select relname,relrowsecurity from pg_class where relname in ('ingredient_drafts','ingredient_draft_documents')")
    assert.equal(rls.rows.length,2); assert.ok(rls.rows.every(row=>row.relrowsecurity))
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.query('select * from ingredient_drafts'),/permission denied/)
      await assert.rejects(db.query('select * from ingredient_draft_documents'),/permission denied/)
      await assert.rejects(save(db,uuid(21),0),/permission denied/)
      await assert.rejects(activate(db,uuid(20),1,payload()),/permission denied/)
      await db.exec('reset role')
    }
    await assert.rejects(db.query(`insert into ingredient_draft_documents(draft_id,business_id,storage_path,file_name,file_size,file_type) values($1,$2,'path','file.pdf',1,'application/pdf')`,[uuid(20),uuid(2)]),/draftConflict/)
    await db.query('delete from user_businesses where user_id=$1',[uuid(3)])
    await assert.rejects(save(db,uuid(20),1),/draftForbidden/)
    await assert.rejects(activate(db,uuid(20),1,payload()),/draftForbidden/)
  } finally { await db.close() }
})
