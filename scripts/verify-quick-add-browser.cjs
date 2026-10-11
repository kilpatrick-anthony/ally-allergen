// Browser checks use actual Quick Add handlers with a fixture database; no live records.
// Start the built app on port 3107. See QUICK_ADD_DESIGN.md for optional dependencies.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const translations = require('../tests/helpers/translation-catalog.cjs');
const { setup, uuid } = require('../tests/helpers/quick-add-harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for (const language of (process.env.QUICK_ADD_LANGUAGES || 'en').split(',')) {
 const labels=translations[language];
 assert.ok(labels, `Unsupported language: ${language}`);
 const q=labels.quickAdd;
 assert.deepEqual(Object.keys(q).sort(),Object.keys(translations.en.quickAdd).sort());
 for (const [device,width,height] of [['desktop',1280,900],['mobile',390,844]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:device==='mobile'});
  const backend=setup();
  const db=await require('../tests/helpers/quick-add-review-db.cjs').createReviewDb();
  let currentRole='staff';
  backend.db.rpc=async(name,args)=>{
    try {
      for(const row of backend.rows) {
        const existing=await db.query('select id from quick_add_drafts where id=$1',[row.id]);
        if(!existing.rows.length) await db.query('insert into quick_add_drafts(id,business_id,kind,name,category,site_id,supplier_id,supplier_name,notes,created_by,version,allergen_warnings,dietary_tags) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
          [row.id,row.business_id,row.kind,row.name,row.category || '',row.site_id,row.supplier_id,row.supplier_name,row.notes,row.created_by,row.version,row.allergen_warnings || {},row.dietary_tags || []]);
      }
      for(const photo of backend.photos) {
        const existing=await db.query('select state from quick_add_photos where id=$1',[photo.id]);
        if(!existing.rows.length) await db.query('insert into quick_add_photos(id,draft_id,business_id,content_hash,byte_size,created_by) values ($1,$2,$3,$4,$5,$6)',
          [photo.id,photo.draft_id,photo.business_id,photo.content_hash,photo.byte_size,photo.created_by]);
        if(existing.rows[0]?.state!==photo.state) await db.query('update quick_add_photos set state=$1 where id=$2',[photo.state,photo.id]);
      }
      await db.query('update user_businesses set role=$1 where user_id=$2',[currentRole,uuid(3)]);
      const result=await db.query('select * from transition_quick_add($1,$2,$3,$4,$5,$6,$7,$8)',
        [args.p_draft,args.p_business,args.p_actor,args.p_request,args.p_action,args.p_version,args.p_review,args.p_note]);
      Object.assign(backend.rows.find(row=>row.id===args.p_draft),result.rows[0]);
      backend.history.splice(0,backend.history.length,...(await db.query('select * from quick_add_history')).rows);
      return {data:result.rows[0]};
    } catch(error) {return {error:{message:error.message}}}
  };
  const failures=[];
  await context.addInitScript(language=>{localStorage.setItem('jencoach_dismissed','true');localStorage.setItem('defaultLanguage',language)},language);
  const page=await context.newPage();
  page.on('pageerror',e=>failures.push(e.message));
  async function audit(stage) {
    if (process.env.QUICK_ADD_A11Y !== '1') return;
    if (!await page.evaluate(()=>!!window.axe)) await page.addScriptTag({path:process.env.AXE_SCRIPT || '/tmp/ally-quick-add-check/node_modules/axe-core/axe.min.js'});
    for (const theme of ['light','dark']) {
      await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
      // Let finite CSS theme transitions finish before measuring contrast.
      await page.evaluate(async()=>{
        await new Promise(requestAnimationFrame);
        await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
      });
      const result=await page.evaluate(async()=>window.axe.run('[role=dialog]', {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
      require('node:fs').writeFileSync(`/tmp/ally-a11y-${language}-${device}-${stage}-${theme}.json`,JSON.stringify(result,null,2));
      assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${stage} ${theme} accessibility`);
    }
    await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  }
  let failSave=false;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();
   let response={status:200,body:{}};
   const body=()=>({json:async()=>req.postDataJSON()});
   if(url.pathname==='/api/auth/session') response.body={authenticated:true,user:{id:uuid(3),name:'Test staff',email:'test@example.invalid',role:currentRole,businessId:uuid(1)}};
   else if(url.pathname.startsWith('/api/business/')) response.body={settings:{defaultLanguage:language}};
   else if(url.pathname==='/api/sites') response.body={sites:[{id:uuid(5),name:q.location}]};
   else if(url.pathname==='/api/suppliers') response.body={suppliers:[{id:uuid(6),name:'Existing supplier'}]};
   else if(url.pathname==='/api/ingredients/categories') response.body={categories:['Bakery','House ingredient']};
   else if(url.pathname==='/api/menu-items/categories') response.body={categories:['Retail','House product']};
   else if(url.pathname==='/api/quick-add-drafts') {
    if(failSave && method==='POST') {failSave=false; return route.fulfill({status:503,json:{error:'unavailable'}})}
    response=method==='POST'?await backend.collection.POST(body()):await backend.collection.GET({nextUrl:url});
   } else if (url.pathname.startsWith('/api/quick-add-evidence/')) {
    response=await backend.evidence.GET({}, {params:Promise.resolve({photoId:url.pathname.split('/').pop()})});
    if(response instanceof Response) return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
   } else if (url.pathname.endsWith('/transition')) {
    response=await backend.transition.POST(body(),{params:Promise.resolve({id:url.pathname.split('/')[3]})});
   } else if (/\/photos(?:\/|$)/.test(url.pathname)) {
    const parts=url.pathname.split('/');
    const params={params:Promise.resolve({id:parts[3],photoId:parts[5]})};
    if(parts[5]) {
      const request=new Request(url,{method,...(method==='PUT'?{body:req.postDataBuffer()}: {})});
      response=await backend.photoItem[method](request,params);
      if(response instanceof Response) return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
    } else response=await backend.photoCollection.GET({},params);
   } else if(url.pathname.startsWith('/api/quick-add-drafts/')) {
    const params={params:Promise.resolve({id:url.pathname.split('/').pop()})};
    response=method==='PATCH'?await backend.item.PATCH(body(),params):await backend.item.GET({},params);
   } else if(url.pathname.includes('notification')) response.body={notifications:[]};
   await route.fulfill({status:response.status,json:response.body});
  });
  await page.route('**/*.supabase.co/**',route=>route.abort());
  await page.goto(`${process.env.BASE_URL || 'http://localhost:3107'}/admin/quick-add`);
  await page.getByRole('heading',{name:q.drafts,exact:true}).waitFor();
  await page.getByRole('button',{name:labels.cookieConsent.rejectNonEssential,exact:true}).click();
  const floatingAdd=page.locator('button[aria-haspopup="dialog"][title]');
  const logo=page.getByRole('img',{name:'AllyJen',exact:true});
  if(device==='mobile') {
    await logo.waitFor();
    assert.equal(await logo.evaluate(img=>img.complete && img.naturalWidth>0),true);
    const bounds=await logo.boundingBox();
    assert.ok(Math.abs(bounds.x+bounds.width/2-width/2)<1,'Mobile logo is centred');
    const addBounds=await floatingAdd.boundingBox();
    assert.ok(addBounds.width>=44 && addBounds.height>=44 && addBounds.x>width/2 && addBounds.x+addBounds.width<=width && addBounds.y+addBounds.height<=height,'Floating Add stays inside the lower-right viewport with a touch target');
    assert.equal(await page.getByRole('button',{name:labels.liveDashboard.contactUs,exact:true}).isVisible(),false);
    await page.screenshot({path:'/tmp/ally-mobile-header.png'});
    await floatingAdd.tap();
  } else {
    assert.equal(await floatingAdd.isVisible(),false);
    const contact=page.getByRole('button',{name:labels.liveDashboard.contactUs,exact:true});
    await contact.click();
    await page.getByText(labels.liveDashboard.contactTeam,{exact:true}).waitFor();
    await page.getByRole('button',{name:new RegExp(labels.liveDashboard.closeMessage.replace('{name}','(Ally|Jen)'))}).first().click();
    await page.getByRole('button',{name:q.title,exact:true}).click();
  }
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel(q.name).waitFor();
  await dialog.getByRole('button',{name:q.close,exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await dialog.getByRole('button',{name:q.cancel,exact:true}).evaluate(el=>el===document.activeElement),true,'Shift+Tab wraps inside the dialog');
  await page.keyboard.press('Tab');
  assert.equal(await dialog.getByRole('button',{name:q.close,exact:true}).evaluate(el=>el===document.activeElement),true,'Tab wraps inside the dialog');
  await audit('capture');
  await dialog.getByLabel(q.name).fill('   ');
  await dialog.getByRole('button',{name:q.save,exact:true}).click();
  assert.equal(await dialog.getByLabel(q.name).getAttribute('aria-invalid'),'true');
  assert.equal(await dialog.getByLabel(q.name).evaluate(el=>el===document.activeElement && !!document.getElementById(el.getAttribute('aria-describedby'))),true,'Invalid name receives focus and an associated error');
  await dialog.getByLabel(q.name).fill('Delivery bread');
  const category = dialog.getByLabel(q.category,{exact:true});
  assert.equal(await category.getAttribute('list') !== null,true,'Category uses the existing category list');
  assert.equal(await dialog.locator(`datalist#${await category.getAttribute('list')} option[value="Bakery"]`).count(),1,'Ingredient categories include business categories');
  await category.fill('Bakery');
  await dialog.getByText(q.captureAssessment,{exact:true}).click();
  await dialog.getByLabel(labels.allergenNames.milk,{exact:true}).selectOption('contains');
  await dialog.getByLabel(labels.allergenNames.cereals_gluten,{exact:true}).selectOption('contains');
  await dialog.getByLabel(labels.allergenSubtypes.wheat,{exact:true}).selectOption('contains');
  await dialog.getByLabel(q.tag_Vegetarian,{exact:true}).check();
  await dialog.getByText(q.captureAssessment,{exact:true}).click();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')),true);
  await dialog.getByLabel(q.location).selectOption(uuid(5));
  await dialog.getByLabel(q.supplier,{exact:true}).selectOption('new');
  await dialog.getByLabel(q.supplierName,{exact:true}).fill('New supplier');
  await dialog.getByLabel(q.notes).fill('Replacement product');
  // Failed request retains all entered values.
  failSave=true;
  await dialog.getByRole('button',{name:q.save,exact:true}).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByLabel(q.name).inputValue(),'Delivery bread');
  await dialog.getByRole('button',{name:q.save,exact:true}).click();
  await dialog.getByText(q.saved,{exact:true}).waitFor();
  assert.equal(await dialog.getByText(q.saved,{exact:true}).evaluate(el=>el===document.activeElement),true,'Saving moves focus to the confirmation');
  assert.equal(backend.rows.length,1);
  assert.equal(backend.rows[0].category,'Bakery','Capture saves the selected category');
  assert.equal(backend.rows[0].allergen_warnings.milk,'contains','Translated selection keeps the canonical allergen level');
  assert.deepEqual(Array.from(backend.rows[0].dietary_tags),['Vegetarian'],'Translated tag keeps its canonical stored value');
  const bytes=await require('sharp')({create:{width:160,height:80,channels:3,background:'#ddeeff'}}).png().toBuffer();
  await dialog.getByLabel(q.choosePhotos,{exact:true}).waitFor();
  await dialog.getByLabel(q.choosePhotos,{exact:true}).setInputFiles([{name:'label.png',mimeType:'image/png',buffer:bytes},{name:'ingredients.png',mimeType:'image/png',buffer:bytes}]);
  await dialog.getByRole('img',{name:`${q.labelPhoto} 2`,exact:true}).waitFor();
  await dialog.getByText(q.photoSaved,{exact:true}).nth(1).waitFor();
  assert.equal(backend.photos.filter(p=>p.state==='ready').length,2);
  await dialog.getByRole('button',{name:`${q.removePhoto} 2`,exact:true}).click();
  await dialog.getByRole('img',{name:`${q.labelPhoto} 2`,exact:true}).waitFor({state:'hidden'});
  await page.waitForFunction(label=>document.activeElement?.getAttribute('aria-label')===label,q.choosePhotos);
  backend.failures.upload=true;
  await dialog.getByLabel(q.choosePhotos,{exact:true}).setInputFiles({name:'retry.png',mimeType:'image/png',buffer:bytes});
  await dialog.getByText(q.photoFailed,{exact:false}).waitFor();
  assert.equal(backend.rows.length,1);
  page.once('dialog',prompt=>prompt.dismiss());
  await dialog.getByRole('button',{name:q.another,exact:true}).click();
  assert.equal(await dialog.getByText(q.saved,{exact:true}).isVisible(),true);
  backend.failures.upload=false;
  await dialog.getByRole('button',{name:`${q.retry}: ${q.labelPhoto} 2`,exact:true}).click();
  await dialog.getByText(q.photoSaved,{exact:true}).nth(1).waitFor();
  assert.equal(backend.photos.filter(p=>p.state==='ready').length,2);
  await audit('photos');
  await page.screenshot({path:`/tmp/ally-quick-add-${language}-${device}-photos.png`});
  await page.screenshot({path:`/tmp/ally-quick-add-${language}-${device}-saved.png`});
  await dialog.getByRole('button',{name:q.another,exact:true}).click();
  assert.equal(await dialog.getByLabel(q.name).evaluate(el=>el===document.activeElement),true,'Add another focuses the new product name');
  assert.equal(await dialog.getByLabel(q.name).inputValue(),'');
  assert.equal(await dialog.getByRole('img').count(),0);
  assert.equal(await dialog.getByLabel(q.supplierName,{exact:true}).inputValue(),'New supplier');
  assert.equal(await dialog.getByLabel(q.notes).inputValue(),'');
  assert.equal(await dialog.getByLabel(labels.allergenNames.milk,{exact:true}).inputValue(),'');
  assert.equal(await dialog.getByLabel(q.tag_Vegetarian,{exact:true}).isChecked(),false);
  assert.equal(await dialog.getByLabel(q.location).inputValue(),uuid(5));
  await dialog.getByLabel(q.name).fill('Second product');
  page.once('dialog',prompt=>prompt.dismiss());
  await dialog.getByRole('button',{name:q.cancel,exact:true}).click();
  assert.equal(await dialog.isVisible(),true);
  page.once('dialog',prompt=>prompt.accept());
  await dialog.getByRole('button',{name:q.cancel,exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement?.matches('button[aria-haspopup="dialog"]'));
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
    await page.screenshot({path:`/tmp/ally-quick-add-${language}-${device}-cards-${theme}.png`});
  }
  await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  await page.getByRole('link').filter({hasText:q.details}).filter({hasText:'Delivery bread'}).click();
  await dialog.getByLabel(q.name).waitFor();
  assert.equal(await dialog.getByLabel(q.name).inputValue(),'Delivery bread');
  await dialog.getByText(q.photoSaved,{exact:true}).nth(1).waitFor();
  assert.equal(await dialog.getByRole('img').count(),2);
  await dialog.getByLabel(q.notes).fill('Checked on desktop or phone');
  await page.screenshot({path:`/tmp/ally-quick-add-${language}-${device}-form.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  const saveBounds=await dialog.getByRole('button',{name:q.save,exact:true}).boundingBox();
  assert.ok(saveBounds.y>=0 && saveBounds.y+saveBounds.height<=height, 'Save remains visible without scrolling');
  await dialog.getByRole('button',{name:q.save,exact:true}).click();
  await dialog.getByText(q.saved,{exact:true}).waitFor();
  assert.equal(backend.rows[0].version,2);
  assert.equal(backend.rows[0].notes,'Checked on desktop or phone');
  await dialog.getByRole('button',{name:q.submit,exact:true}).click();
  await dialog.getByRole('button',{name:q.withdraw,exact:true}).waitFor();
  assert.equal(backend.rows[0].status,'ready_for_review');
  assert.equal(await dialog.getByRole('heading',{name:`${q.reviewTitle} · ${q.ready_for_review}`,exact:true}).evaluate(el=>el===document.activeElement),true,'Submission moves focus to the new review status');
  assert.equal(await dialog.getByLabel(q.name).isDisabled(),true);
  assert.equal(await dialog.getByRole('button',{name:q.approve,exact:true}).count(),0);
  await dialog.getByRole('button',{name:q.close,exact:true}).click();
  await page.waitForURL(url=>!url.searchParams.has('draft'));
  await page.waitForFunction(()=>document.activeElement?.matches('a[href*="draft="]'));
  currentRole='manager';backend.setRole('manager');
  await page.reload();
  await page.getByRole('link').filter({hasText:q.details}).filter({hasText:'Delivery bread'}).click();
  await dialog.getByLabel(q.reviewSupplier,{exact:true}).selectOption(uuid(6)).catch(async error=>{
    await page.screenshot({path:'/tmp/ally-review-failure.png'});
    console.log('Review failure URL:',page.url(),'Backend:',backend.rows.map(r=>({id:r.id,status:r.status})), 'Errors:',failures);
    console.log((await page.locator('body').innerText()).slice(-5000));throw error;
  });
  const reviewSection = dialog.getByRole('region',{name:q.reviewTitle,exact:true});
  const reviewCategory = reviewSection.getByLabel(q.category,{exact:true});
  assert.equal(await reviewCategory.inputValue(),'Bakery','Review inherits the capture category');
  assert.equal(await dialog.locator(`datalist#${await reviewCategory.getAttribute('list')} option[value="House ingredient"]`).count(),1,'Review offers existing categories');
  await audit('review');
  assert.equal(await dialog.getByLabel(labels.allergenNames.milk,{exact:true}).inputValue(),'contains');
  assert.equal(await dialog.getByLabel(q.tag_Vegetarian,{exact:true}).isChecked(),true);
  for(const label of Object.values(labels.allergenNames)) {
    await dialog.getByLabel(label,{exact:true}).selectOption('none');
  }
  await dialog.getByLabel(q.dietaryChecked,{exact:true}).check();
  await dialog.getByLabel(q.evidenceChecked,{exact:true}).check();
  assert.equal(await dialog.getByRole('button',{name:q.approve,exact:true}).isDisabled(),true);
  await dialog.getByRole('button',{name:q.saveReview,exact:true}).click();
  await page.waitForFunction(label=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent===label&&!button.disabled),q.approve);
  await dialog.getByRole('button',{name:q.approve,exact:true}).click();
  await dialog.getByRole('link',{name:q.openApproved,exact:true}).waitFor();
  assert.equal(backend.rows[0].status,'approved');
  await audit('approved');
  assert.equal((await db.query('select count(*)::int as n from ingredients')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from datasheets')).rows[0].n,2);
  await page.screenshot({path:`/tmp/ally-quick-add-${language}-${device}-approved.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  // Direct links have no opener; closing returns to the page heading and keeps the filter.
  await page.goto(`${process.env.BASE_URL || 'http://localhost:3107'}/admin/quick-add?status=approved&draft=${backend.rows[0].id}`);
  await dialog.getByRole('link',{name:q.openApproved,exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.waitForURL(url=>!url.searchParams.has('draft') && url.searchParams.get('status')==='approved');
  await page.waitForFunction(()=>document.activeElement?.tagName==='H1');
  assert.deepEqual(failures,[]);
  await db.close();
  console.log(`PASS ${language}-${device}: create, failed-save retry, multi-photo upload, failed-upload retry, removal, Add another, discard confirmation, list, reopen photos, edit, staff submission, manager review and approval; no page errors or horizontal overflow${process.env.QUICK_ADD_A11Y === '1' ? '; light/dark axe checks passed' : ''}. Actual route handlers with fixture storage and PostgreSQL review/approval transaction.`);
  await context.close();
 }
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
