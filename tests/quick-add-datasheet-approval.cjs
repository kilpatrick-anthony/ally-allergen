const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createReviewDb, completeReview, uuid } = require('./helpers/quick-add-review-db.cjs')

test('datasheet-only captures approve with checked evidence, remain private, and reject missing or pending evidence', async () => {
  const db = await createReviewDb()
  try {
    let sequence = 1000
    async function seed(id, kind = 'ingredient') {
      await db.query('insert into quick_add_drafts(id,business_id,kind,name,created_by) values ($1,$2,$3,$4,$5)', [uuid(id), uuid(1), kind, 'Product', uuid(3)])
    }
    async function sheet(id, attachment, state = 'ready') {
      await db.query('insert into quick_add_datasheets(id,draft_id,business_id,file_name,content_type,content_hash,byte_size,created_by) values ($1,$2,$3,$4,$5,$6,100,$7)', [uuid(attachment), uuid(id), uuid(1), 'Product.pdf', 'application/pdf', 'a'.repeat(64), uuid(3)])
      if (state !== 'pending') await db.query('update quick_add_datasheets set state=$1 where id=$2', [state, uuid(attachment)])
    }
    const run = async (id, actor, action, version, review = null) => (await db.query('select * from transition_quick_add($1,$2,$3,$4,$5,$6,$7,$8)', [uuid(id), uuid(1), uuid(actor), uuid(sequence++), action, version, review, ''])).rows[0]
    for (const [id, kind] of [[10, 'ingredient'], [11, 'packaged_product']]) {
      await seed(id, kind); await sheet(id, id + 100)
      await db.exec('set role service_role')
      let draft = await run(id, 3, 'submit', 1)
      draft = await run(id, 4, 'review', draft.version, { ...completeReview(), evidence_checked: false })
      await assert.rejects(run(id, 4, 'approve', draft.version), /missingEvidence/)
      draft = await run(id, 4, 'review', draft.version, completeReview())
      draft = await run(id, 4, 'approve', draft.version)
      assert.equal(draft.status, 'approved')
      const evidence = (await db.query('select * from datasheets where file_path=$1', [`/api/quick-add-datasheet-evidence/${uuid(id + 100)}`])).rows[0]
      assert.ok(evidence); assert.equal(evidence.business_id, uuid(1))
      if (kind === 'packaged_product') assert.equal((await db.query('select is_active from menu_items where id=$1', [draft.menu_item_id])).rows[0].is_active, false)
      await db.exec('reset role')
    }
    await seed(12); await sheet(12, 112, 'pending')
    await db.exec('set role service_role')
    await assert.rejects(run(12, 3, 'submit', 1), /pendingPhotos/)
    await db.exec('reset role')
    await db.query("update quick_add_datasheets set state='removed' where id=$1", [uuid(112)])
    let draft = await run(12, 3, 'submit', 1)
    draft = await run(12, 4, 'review', draft.version, completeReview())
    await assert.rejects(run(12, 4, 'approve', draft.version), /missingEvidence/)
    const fn = (await db.query("select prosecdef,proconfig from pg_proc where oid='public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text)'::regprocedure")).rows[0]
    assert.equal(fn.prosecdef, false)
    assert.ok(fn.proconfig.some(value => value.startsWith('search_path=')))
    assert.equal((await db.query("select has_function_privilege('authenticated','public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text)','execute') allowed")).rows[0].allowed, false)
  } finally { await db.close() }
})
