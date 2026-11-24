const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { createReviewDb, completeReview, uuid } = require('./helpers/quick-add-review-db.cjs')

const uk = uuid(10), ireland = uuid(5), business = uuid(1), supplier = uuid(6), staff = uuid(3), manager = uuid(4)
const sharedItem = uuid(11), irishItem = uuid(12), ukItem = uuid(13), ingredient = uuid(14), spec = uuid(15)
const migration = 'supabase/migrations/20261120133040_uk_locations_allergen_publications_and_ppds.sql'
const guideSourceMigration = 'supabase/migrations/20261124205447_guide_assessment_source_details.sql'
const labelMigration = 'supabase/migrations/20261120143800_optional_ingredient_labels_for_all_locations.sql'

async function setup() {
  const db = await createReviewDb()
  await db.exec(`alter table sites add column is_active boolean default true;
    alter table menu_items add column if not exists subcategory text;
    alter table menu_items add column if not exists display_order int;
    alter table menu_items add column if not exists price numeric;
    alter table menu_items add column if not exists color text;
    alter table menu_items add column if not exists icon text;
    alter table menu_items add column if not exists manufacturer text;
    alter table menu_items add column if not exists updated_at timestamptz;
    alter table datasheets add column if not exists version text;`)
  await db.exec(fs.readFileSync(migration, 'utf8'))
  await db.exec(fs.readFileSync(labelMigration, 'utf8'))
  await db.exec(fs.readFileSync(guideSourceMigration, 'utf8'))
  await db.query("insert into sites(id, business_id, name, jurisdiction) values ($1,$2,'Belfast','NI')", [uk, business])
  const warnings = JSON.stringify(completeReview().allergen_warnings)
  await db.query(`insert into menu_items(id,business_id,name,category,is_active,site_id,allergen_warnings,item_type)
    values ($1,$4,'Shared soup','Meals',true,null,$5::jsonb,'prepared'),
      ($2,$4,'Dublin breakfast','Meals',true,$6,$5::jsonb,'prepared'),
      ($3,$4,'Belfast sandwich','Meals',true,$7,$5::jsonb,'prepared')`,
  [sharedItem, irishItem, ukItem, business, warnings, ireland, uk])
  await db.query("insert into ingredients(id,business_id,name,status,allergen_warnings) values ($1,$2,'Bread','active',$3::jsonb)", [ingredient, business, warnings])
  await db.query("insert into menu_item_ingredients(menu_item_id,ingredient_id) values ($1,$2)", [ukItem, ingredient])
  await db.query(`insert into datasheets(id,business_id,ingredient_id,file_name,file_path,supplier_name,version,next_review_date,status)
    values ($1,$2,$3,'Bread v1','/api/evidence','Supplier','v1','2099-01-01','active')`, [spec, business, ingredient])
  await db.query(`insert into ingredient_supplier_variants(business_id,ingredient_id,supplier_id,allergen_warnings,assessment_status)
    values ($1,$2,$3,$4::jsonb,'assessed')`, [business, ingredient, supplier, warnings])
  return db
}

async function value(db, sql, values) {
  return (await db.query(sql, values)).rows[0].result
}

test('legacy Irish locations default to IE and location publication stays scoped and versioned for mixed accounts', async () => {
  const db = await setup()
  try {
    assert.equal(await value(db, 'select jurisdiction result from sites where id=$1', [ireland]), 'IE')
    assert.equal(await value(db, 'select count(*)::int result from site_allergen_publications', []), 0)
    await db.exec('set role service_role')
    const ie = await value(db, 'select review_site_allergens($1,$2) result', [ireland, business])
    const ni = await value(db, 'select review_site_allergens($1,$2) result', [uk, business])
    assert.deepEqual(ie.items.map(i => i.id), [sharedItem, irishItem])
    assert.deepEqual(ni.items.map(i => i.id), [sharedItem, ukItem])
    const [source] = ni.items.find(item => item.id === ukItem).ingredient_assessments
    assert.equal(source.id, ingredient)
    assert.equal(source.name, 'Bread')
    assert.equal(await value(db, 'select review_site_allergens($1,$2) result', [uk, uuid(2)]), null)
    const publication = 'select publish_site_allergens($1,$2,$3,$4,$5::jsonb) result'
    await assert.rejects(value(db, publication, [uk, business, staff, ni.fingerprint, JSON.stringify(ni.items)]), /permission/i)
    const initial = await value(db, publication, [uk, business, manager, ni.fingerprint, JSON.stringify(ni.items)])
    assert.equal(await value(db, publication, [uk, business, manager, ni.fingerprint, JSON.stringify(ni.items)]), initial)
    await db.query("update menu_items set name='Updated Belfast sandwich' where id=$1", [ukItem])
    await assert.rejects(value(db, publication, [uk, business, manager, ni.fingerprint, JSON.stringify(ni.items)]), /Menu changed/)
    const stored = await value(db, 'select items result from site_allergen_publications where id=$1', [initial])
    assert.equal(stored.find(item => item.id === ukItem).name, 'Belfast sandwich')
    const updated = await value(db, 'select review_site_allergens($1,$2) result', [uk, business])
    assert.notEqual(await value(db, publication, [uk, business, manager, updated.fingerprint, JSON.stringify(updated.items)]), initial)
    await db.exec('reset role; set role anon')
    await assert.rejects(db.query('select * from site_allergen_publications'), /permission denied/)
  } finally { await db.close() }
})

test('a supplier change flags the approved PPDS revision and stale approvals cannot replace the audit history', async () => {
  const db = await setup()
  try {
    await db.exec('set role service_role')
    const review = 'select review_site_ppds_source($1,$2,$3) result'
    const overview = 'select site_ppds_overview($1,$2) result'
    const record = 'select record_site_ppds_revision($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) result'
    const initial = await value(db, review, [uk, business, ukItem])
    assert.equal(initial.source.specifications[0].version, 'v1')
    assert.equal((await value(db, review, [ireland, business, ukItem])).source, null)
    assert.equal((await value(db, review, [uk, business, irishItem])).source, null)
    const label = JSON.stringify({ input: { specifications: [{ documentId: spec }] }, rendered: { foodName: 'Belfast sandwich' } })
    const values = [uk, business, ukItem, manager, null, initial.fingerprint, 'ppds', '{}', label]
    await assert.rejects(value(db, record, [...values.slice(0, 3), staff, ...values.slice(4)]), /permission/i)
    const approved = await value(db, record, values)
    assert.deepEqual(await value(db, overview, [uk, business]), [{ itemId: ukItem, state: 'approved' }])
    await db.query("update datasheets set version='v2' where id=$1", [spec])
    const changed = await value(db, review, [uk, business, ukItem])
    assert.notEqual(changed.fingerprint, initial.fingerprint)
    assert.deepEqual(await value(db, overview, [uk, business]), [{ itemId: ukItem, state: 'review' }])
    await assert.rejects(value(db, record, [uk, business, ukItem, manager, approved, initial.fingerprint, 'ppds', '{}', label]), /data changed/)
    const revision = await value(db, record, [uk, business, ukItem, manager, approved, changed.fingerprint, 'ppds', '{}', label])
    assert.notEqual(revision, approved)
    const history = (await db.query("select source->'specifications'->0->>'version' version from site_ppds_revisions order by recorded_at")).rows
    assert.deepEqual(history.map(row => row.version), ['v1', 'v2'])
    await db.exec('reset role; set role authenticated')
    await assert.rejects(db.query('select * from site_ppds_revisions'), /permission denied/)
  } finally { await db.close() }
})

test('Irish locations can approve optional ingredient labels without UK PPDS classification', async () => {
  const db = await setup()
  try {
    await db.exec('set role service_role')
    const review = await value(db, 'select review_site_ppds_source($1,$2,$3) result', [ireland, business, irishItem])
    assert.equal(review.source.jurisdiction, 'IE')
    const label = JSON.stringify({ input: { specifications: [] }, rendered: { foodName: 'Dublin breakfast' } })
    const revision = await value(db,
      'select record_site_ppds_revision($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) result',
      [ireland, business, irishItem, manager, null, review.fingerprint, 'ingredient_label', '{}', label])
    assert.deepEqual(await value(db, 'select site_ppds_overview($1,$2) result', [ireland, business]),
      [{ itemId: irishItem, state: 'approved' }])
    const stored = await value(db, 'select jsonb_build_object(\'jurisdiction\',jurisdiction,\'classification\',classification) result from site_ppds_revisions where id=$1', [revision])
    assert.deepEqual(stored, { jurisdiction: 'IE', classification: 'ingredient_label' })
  } finally { await db.close() }
})
