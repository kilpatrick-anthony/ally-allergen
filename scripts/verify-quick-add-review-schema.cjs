const assert = require('node:assert/strict')
const { createReviewDb, completeReview, uuid } = require('../tests/helpers/quick-add-review-db.cjs')
;(async()=>{
 const db=await createReviewDb(); let sequence=1000
 const run=async(id,actor,action,version,review=null,note='',request=uuid(sequence++)) => (await db.query(
  'select * from transition_quick_add($1,$2,$3,$4,$5,$6,$7,$8)',[uuid(id),uuid(1),uuid(actor),request,action,version,review,note])).rows[0]
 async function seed(id,kind='ingredient',photo=true) {
  await db.query('insert into quick_add_drafts(id,business_id,kind,name,created_by) values ($1,$2,$3,$4,$5)',[uuid(id),uuid(1),kind,'Delivery',uuid(3)])
  if(photo) {
   await db.query("insert into quick_add_photos(id,draft_id,business_id,content_hash,byte_size,created_by) values ($1,$2,$3,$4,100,$5)",[uuid(id+100),uuid(id),uuid(1),'a'.repeat(64),uuid(3)])
   await db.query("update quick_add_photos set state='ready' where id=$1",[uuid(id+100)])
  }
 }
 const count=async(table)=>(await db.query(`select count(*)::int as n from ${table}`)).rows[0].n
 await seed(10)
 await db.exec('set role service_role')
 await assert.rejects(run(10,7,'submit',1),/forbidden/)
 await assert.rejects(run(10,3,'approve',1),/forbidden/)
 const submitId=uuid(sequence++)
 let d=await run(10,3,'submit',1,null,'',submitId)
 assert.equal(d.status,'ready_for_review');assert.equal(d.submitted_by,uuid(3))
 assert.equal((await run(10,3,'submit',1,null,'',submitId)).version,2)
 await assert.rejects(run(10,3,'withdraw',2,null,'',submitId),/editConflict/)
 await assert.rejects(db.query("update quick_add_photos set state='removed' where draft_id=$1",[uuid(10)]),/photoDraftConflict/)
 await assert.rejects(run(10,4,'return',2),/returnNoteRequired/)
 d=await run(10,4,'return',2,null,'Need back label');assert.equal(d.status,'draft');assert.equal(d.return_note,'Need back label')
 d=await run(10,3,'submit',3);d=await run(10,3,'withdraw',4);assert.equal(d.status,'draft')
 d=await run(10,3,'submit',5)
 for(const [review,code] of [
  [{...completeReview(),allergen_warnings:{}},'missingAllergens'],
  [{...completeReview(),supplier_id:uuid(9)},'missingSupplier'],
  [{...completeReview(),evidence_checked:false},'missingEvidence'],
  [{...completeReview(),allergen_warnings:{...completeReview().allergen_warnings,nuts:'contains'}},'missingAllergens'],
  [{...completeReview(),allergen_warnings:{...completeReview().allergen_warnings,nuts_levels:{almonds:'contains'}}},'missingAllergens'],
 ]) {
  d=await run(10,4,'review',d.version,review)
  await assert.rejects(run(10,4,'approve',d.version),new RegExp(code))
  assert.equal(await count('ingredients'),0)
 }
 const assessed=completeReview();assessed.allergen_warnings.cereals_gluten='contains';assessed.allergen_warnings.cereals_gluten_levels={wheat:'contains',barley:'none',oats:'none',rye:'none'}
 d=await run(10,4,'review',d.version,assessed)
 await assert.rejects(run(10,4,'approve',d.version-1),/editConflict/)
 // Simulate a failure late in promotion: destination, variants and evidence must roll back.
 await db.exec("reset role; alter table audit_log add constraint test_fail check(action<>'created'); set role service_role")
 await assert.rejects(run(10,4,'approve',d.version),/test_fail/)
 for(const table of ['ingredients','ingredient_supplier_variants','datasheets']) assert.equal(await count(table),0)
 await db.exec('reset role; alter table audit_log drop constraint test_fail; set role service_role')
 const approvalId=uuid(sequence++), priorVersion=d.version
 d=await run(10,4,'approve',priorVersion,null,'',approvalId)
 assert.equal(d.status,'approved'); assert.ok(d.ingredient_id);assert.equal(d.approved_by,uuid(4))
 const replay=await run(10,4,'approve',priorVersion,null,'',approvalId);assert.equal(replay.ingredient_id,d.ingredient_id)
 for(const table of ['ingredients','ingredient_supplier_variants','datasheets','audit_log']) assert.equal(await count(table),1)
 assert.equal((await db.query('select changes from audit_log')).rows[0].changes[0].label,'Quick Add capture');
 const ingredient=(await db.query('select * from ingredients')).rows[0];assert.equal(ingredient.allergen_warnings.cereals_gluten,'contains');assert.equal(ingredient.allergen_warnings.cereals_gluten_levels.wheat,'contains');
 const evidence=(await db.query('select * from datasheets')).rows[0];assert.match(evidence.file_path,/^\/api\/quick-add-evidence\//)
 await assert.rejects(run(10,4,'approve',d.version),/editConflict/)
 // Bought-in product must stay inactive, including site-specific scope.
 await seed(11,'packaged_product')
 d=await run(11,3,'submit',1)
 const invalidScope={...completeReview(),scope:'site',site_id:uuid(8)}
 d=await run(11,4,'review',d.version,invalidScope)
 await assert.rejects(run(11,4,'approve',d.version),/locationUnavailable/)
 d=await run(11,4,'review',d.version,{...completeReview(),scope:'site',site_id:uuid(5),label_checked:false})
 await assert.rejects(run(11,4,'approve',d.version),/missingLabel/)
 d=await run(11,4,'review',d.version,{...completeReview(),scope:'site',site_id:uuid(5)})
 d=await run(11,4,'approve',d.version)
 const product=(await db.query('select * from menu_items')).rows[0]
 assert.equal(product.is_active,false);assert.equal(product.visibility,'site-specific');assert.equal(product.site_id,uuid(5))
 assert.equal(product.label_verified_by,uuid(4))
 await seed(12,'ingredient',false)
 await db.query("insert into quick_add_photos(id,draft_id,business_id,content_hash,byte_size) values ($1,$2,$3,$4,100)",[uuid(112),uuid(12),uuid(1),'a'.repeat(64)])
 await assert.rejects(run(12,3,'submit',1),/pendingPhotos/)
 await db.query("update quick_add_photos set state='removed' where draft_id=$1",[uuid(12)])
 d=await run(12,3,'submit',1);d=await run(12,4,'review',d.version,completeReview())
 await assert.rejects(run(12,4,'approve',d.version),/missingEvidence/)
 // Returned assessments require a fresh evidence confirmation on resubmission.
 d=await run(12,4,'return',d.version,null,'Need evidence');assert.equal(d.review.evidence_checked,false)
 d=await run(12,3,'submit',d.version);assert.equal(d.review.evidence_checked,false)
 // Capture suggestions seed review; selected tags require independent verification.
 for (const [id,kind] of [[20,'ingredient'],[21,'packaged_product']]) {
  await seed(id,kind)
  await db.query('update quick_add_drafts set allergen_warnings=$1,dietary_tags=$2 where id=$3',[{milk:'none'},['Vegan'],uuid(id)])
  let capture=await run(id,3,'submit',1)
  assert.equal(capture.review.allergen_warnings.milk,'none');assert.equal(capture.review.allergen_warnings.eggs,undefined)
  assert.deepEqual(capture.review.dietary_tags,['Vegan']);assert.equal(capture.review.dietary_checked,false)
  capture=await run(id,4,'review',capture.version,{...completeReview(),dietary_tags:['Vegan'],dietary_checked:false})
  await assert.rejects(run(id,4,'approve',capture.version),/missingDietaryCheck/)
  capture=await run(id,4,'review',capture.version,{...completeReview(),dietary_tags:['Invalid'],dietary_checked:true})
  await assert.rejects(run(id,4,'approve',capture.version),/invalid/)
  capture=await run(id,4,'review',capture.version,{...completeReview(),dietary_tags:['Vegan'],dietary_checked:true})
  capture=await run(id,4,'return',capture.version,null,'Check tags again');assert.equal(capture.review.dietary_checked,false)
  capture=await run(id,3,'submit',capture.version);assert.equal(capture.review.dietary_checked,false)
  capture=await run(id,4,'review',capture.version,{...completeReview(),dietary_tags:['Vegan'],dietary_checked:true})
  capture=await run(id,4,'approve',capture.version)
  if(kind==='ingredient') {
   const result=(await db.query('select certifications,supplier_profiles from ingredients where id=$1',[capture.ingredient_id])).rows[0]
   assert.deepEqual(result.certifications,['Vegan']);assert.deepEqual(result.supplier_profiles.Supplier.certifications,['Vegan'])
   assert.deepEqual((await db.query('select certifications from ingredient_supplier_variants where ingredient_id=$1',[capture.ingredient_id])).rows[0].certifications,['Vegan'])
  } else {
   const result=(await db.query('select dietary,is_active from menu_items where id=$1',[capture.menu_item_id])).rows[0]
   assert.deepEqual(result.dietary,['Vegan']);assert.equal(result.is_active,false)
  }
 }
 // Removing an uploader must preserve approved evidence and its historical snapshot.
 await db.exec('reset role')
 await db.query('delete from auth.users where id=$1',[uuid(3)]).catch(async error=>{
   // The fixture membership FK has no cascade; remove the membership first, as production does.
   await db.query('delete from user_businesses where user_id=$1',[uuid(3)])
   await db.query('delete from auth.users where id=$1',[uuid(3)])
 })
 assert.equal((await db.query('select created_by from quick_add_photos where draft_id=$1',[uuid(10)])).rows[0].created_by,null)
 for(const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`)
  await assert.rejects(run(12,4,'approve',d.version),/permission denied/)
  await assert.rejects(db.query('select * from quick_add_history'),/permission denied/)
  await db.exec('reset role')
 }
 assert.equal((await db.query("select count(*)::int as n from quick_add_history where action='approve'")).rows[0].n,4)
 console.log('PASS: PostgreSQL submission/return/withdraw, live roles, idempotency, validation, rollback, evidence links, review history and inactive product promotion.')
 await db.close()
})().catch(error=>{console.error(error);process.exitCode=1})
