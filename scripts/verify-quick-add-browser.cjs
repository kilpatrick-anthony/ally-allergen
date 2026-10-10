// Browser checks use actual Quick Add handlers with a fixture database; no live records.
// Start the built app on port 3107. See QUICK_ADD_DESIGN.md for optional dependencies.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { setup, uuid } = require('../tests/helpers/quick-add-harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for (const [device,width,height] of [['desktop',1280,900],['mobile',390,844]]) {
  const context=await browser.newContext({viewport:{width,height}});
  const backend=setup();
  const db=await require('../tests/helpers/quick-add-review-db.cjs').createReviewDb();
  let currentRole='staff';
  backend.db.rpc=async(name,args)=>{
    try {
      for(const row of backend.rows) {
        const existing=await db.query('select id from quick_add_drafts where id=$1',[row.id]);
        if(!existing.rows.length) await db.query('insert into quick_add_drafts(id,business_id,kind,name,site_id,supplier_id,supplier_name,notes,created_by,version,allergen_warnings,dietary_tags) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
          [row.id,row.business_id,row.kind,row.name,row.site_id,row.supplier_id,row.supplier_name,row.notes,row.created_by,row.version,row.allergen_warnings || {},row.dietary_tags || []]);
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
  await context.addInitScript(()=>{localStorage.setItem('jencoach_dismissed','true');localStorage.setItem('defaultLanguage','en')});
  const page=await context.newPage();
  page.on('pageerror',e=>failures.push(e.message));
  let failSave=false;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();
   let response={status:200,body:{}};
   const body=()=>({json:async()=>req.postDataJSON()});
   if(url.pathname==='/api/auth/session') response.body={authenticated:true,user:{id:uuid(3),name:'Test staff',email:'test@example.invalid',role:currentRole,businessId:uuid(1)}};
   else if(url.pathname.startsWith('/api/business/')) response.body={settings:{defaultLanguage:'en'}};
   else if(url.pathname==='/api/sites') response.body={sites:[{id:uuid(5),name:'Delivery location'}]};
   else if(url.pathname==='/api/suppliers') response.body={suppliers:[{id:uuid(6),name:'Existing supplier'}]};
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
  await page.getByRole('heading',{name:'Saved drafts',exact:true}).waitFor();
  await page.getByRole('button',{name:'Reject non-essential',exact:true}).click();
  await page.getByRole('button',{name:'Quick Add',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Product name').fill('Delivery bread');
  await dialog.getByText('Allergens and dietary tags (optional)',{exact:true}).click();
  await dialog.getByLabel('Milk',{exact:true}).selectOption('contains');
  await dialog.getByLabel('Vegetarian',{exact:true}).check();
  await dialog.getByText('Allergens and dietary tags (optional)',{exact:true}).click();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')),true);
  await dialog.getByLabel('Delivery location').selectOption(uuid(5));
  await dialog.getByLabel('Supplier',{exact:true}).selectOption('new');
  await dialog.getByLabel('Supplier name',{exact:true}).fill('New supplier');
  await dialog.getByLabel('Delivery notes').fill('Replacement product');
  // Failed request retains all entered values.
  failSave=true;
  await dialog.getByRole('button',{name:'Save draft',exact:true}).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByLabel('Product name').inputValue(),'Delivery bread');
  await dialog.getByRole('button',{name:'Save draft',exact:true}).click();
  await dialog.getByText('Draft saved — not published',{exact:true}).waitFor();
  assert.equal(backend.rows.length,1);
  const bytes=await require('sharp')({create:{width:160,height:80,channels:3,background:'#ddeeff'}}).png().toBuffer();
  await dialog.getByLabel('Choose photos',{exact:true}).waitFor();
  await dialog.getByLabel('Choose photos',{exact:true}).setInputFiles([{name:'label.png',mimeType:'image/png',buffer:bytes},{name:'ingredients.png',mimeType:'image/png',buffer:bytes}]);
  await page.waitForFunction(()=>document.querySelectorAll('img[alt^="Label photo"]').length===2);
  await dialog.getByText('Photo saved',{exact:true}).nth(1).waitFor();
  assert.equal(backend.photos.filter(p=>p.state==='ready').length,2);
  await dialog.getByRole('button',{name:'Remove photo 2',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('img[alt^="Label photo"]').length===1);
  backend.failures.upload=true;
  await dialog.getByLabel('Choose photos',{exact:true}).setInputFiles({name:'retry.png',mimeType:'image/png',buffer:bytes});
  await dialog.getByText('Photo changes could not be completed.',{exact:false}).waitFor();
  assert.equal(backend.rows.length,1);
  page.once('dialog',prompt=>prompt.dismiss());
  await dialog.getByRole('button',{name:'Add another',exact:true}).click();
  assert.equal(await dialog.getByText('Draft saved — not published',{exact:true}).isVisible(),true);
  backend.failures.upload=false;
  await dialog.getByRole('button',{name:'Try again',exact:true}).click();
  await dialog.getByText('Photo saved',{exact:true}).nth(1).waitFor();
  assert.equal(backend.photos.filter(p=>p.state==='ready').length,2);
  await page.screenshot({path:`/tmp/ally-quick-add-${device}-photos.png`});
  await page.screenshot({path:`/tmp/ally-quick-add-${device}-saved.png`});
  await dialog.getByRole('button',{name:'Add another',exact:true}).click();
  assert.equal(await dialog.getByLabel('Product name').inputValue(),'');
  assert.equal(await dialog.getByRole('img').count(),0);
  assert.equal(await dialog.getByLabel('Supplier name',{exact:true}).inputValue(),'New supplier');
  assert.equal(await dialog.getByLabel('Delivery notes').inputValue(),'');
  assert.equal(await dialog.getByLabel('Milk',{exact:true}).inputValue(),'');
  assert.equal(await dialog.getByLabel('Vegetarian',{exact:true}).isChecked(),false);
  assert.equal(await dialog.getByLabel('Delivery location').inputValue(),uuid(5));
  await dialog.getByLabel('Product name').fill('Second product');
  page.once('dialog',prompt=>prompt.dismiss());
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await dialog.isVisible(),true);
  page.once('dialog',prompt=>prompt.accept());
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
    await page.screenshot({path:`/tmp/ally-quick-add-${device}-cards-${theme}.png`});
  }
  await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  await page.getByRole('link',{name:/open draft.*delivery bread/i}).click();
  await dialog.getByLabel('Product name').waitFor();
  assert.equal(await dialog.getByLabel('Product name').inputValue(),'Delivery bread');
  await dialog.getByText('Photo saved',{exact:true}).nth(1).waitFor();
  assert.equal(await dialog.getByRole('img').count(),2);
  await dialog.getByLabel('Delivery notes').fill('Checked on desktop or phone');
  await page.screenshot({path:`/tmp/ally-quick-add-${device}-form.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  const saveBounds=await dialog.getByRole('button',{name:'Save draft',exact:true}).boundingBox();
  assert.ok(saveBounds.y>=0 && saveBounds.y+saveBounds.height<=height, 'Save remains visible without scrolling');
  await dialog.getByRole('button',{name:'Save draft',exact:true}).click();
  await dialog.getByText('Draft saved — not published',{exact:true}).waitFor();
  assert.equal(backend.rows[0].version,2);
  assert.equal(backend.rows[0].notes,'Checked on desktop or phone');
  await dialog.getByRole('button',{name:'Send for review',exact:true}).click();
  await dialog.getByRole('button',{name:'Withdraw to draft',exact:true}).waitFor();
  assert.equal(backend.rows[0].status,'ready_for_review');
  assert.equal(await dialog.getByLabel('Product name').isDisabled(),true);
  assert.equal(await dialog.getByRole('button',{name:'Approve for use',exact:true}).count(),0);
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.waitForURL(url=>!url.searchParams.has('draft'));
  currentRole='manager';backend.setRole('manager');
  await page.reload();
  await page.getByRole('link',{name:/open draft.*delivery bread/i}).click();
  await dialog.getByLabel('Confirmed supplier',{exact:true}).selectOption(uuid(6)).catch(async error=>{
    await page.screenshot({path:'/tmp/ally-review-failure.png'});
    console.log('Review failure URL:',page.url(),'Backend:',backend.rows.map(r=>({id:r.id,status:r.status})), 'Errors:',failures);
    console.log((await page.locator('body').innerText()).slice(-5000));throw error;
  });
  assert.equal(await dialog.getByLabel('Milk',{exact:true}).inputValue(),'contains');
  assert.equal(await dialog.getByLabel('Vegetarian',{exact:true}).isChecked(),true);
  for(const label of ['Gluten','Crustaceans','Eggs','Fish','Peanuts','Soybeans','Milk','Tree Nuts','Celery','Mustard','Sesame seeds','Sulphur dioxide and sulphites','Lupin','Molluscs']) {
    await dialog.getByLabel(label,{exact:true}).selectOption('none');
  }
  await dialog.getByLabel('I verified every selected dietary tag against the current label or supporting evidence.',{exact:true}).check();
  await dialog.getByLabel('I opened the photos, checked that the labels are readable, and verified this assessment against them.',{exact:true}).check();
  assert.equal(await dialog.getByRole('button',{name:'Approve for use',exact:true}).isDisabled(),true);
  await dialog.getByRole('button',{name:'Save review details',exact:true}).click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Approve for use'&&!button.disabled));
  await dialog.getByRole('button',{name:'Approve for use',exact:true}).click();
  await dialog.getByRole('link',{name:'Open resulting record',exact:true}).waitFor();
  assert.equal(backend.rows[0].status,'approved');
  assert.equal((await db.query('select count(*)::int as n from ingredients')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from datasheets')).rows[0].n,2);
  await page.screenshot({path:`/tmp/ally-quick-add-${device}-approved.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.deepEqual(failures,[]);
  await db.close();
  console.log(`PASS ${device}: create, failed-save retry, multi-photo upload, failed-upload retry, removal, Add another, discard confirmation, list, reopen photos, edit, staff submission, manager review and approval; no page errors or horizontal overflow. Actual route handlers with fixture storage and PostgreSQL review/approval transaction.`);
  await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
