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
  const failures=[];
  await context.addInitScript(()=>{localStorage.setItem('jencoach_dismissed','true');localStorage.setItem('defaultLanguage','en')});
  const page=await context.newPage();
  page.on('pageerror',e=>failures.push(e.message));
  let failSave=false;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();
   let response={status:200,body:{}};
   const body=()=>({json:async()=>req.postDataJSON()});
   if(url.pathname==='/api/auth/session') response.body={authenticated:true,user:{id:uuid(3),name:'Test staff',email:'test@example.invalid',role:'staff',businessId:uuid(1)}};
   else if(url.pathname.startsWith('/api/business/')) response.body={settings:{defaultLanguage:'en'}};
   else if(url.pathname==='/api/sites') response.body={sites:[{id:uuid(5),name:'Delivery location'}]};
   else if(url.pathname==='/api/suppliers') response.body={suppliers:[{id:uuid(6),name:'Existing supplier'}]};
   else if(url.pathname==='/api/quick-add-drafts') {
    if(failSave && method==='POST') {failSave=false; return route.fulfill({status:503,json:{error:'unavailable'}})}
    response=method==='POST'?await backend.collection.POST(body()):await backend.collection.GET({nextUrl:url});
   } else if(url.pathname.startsWith('/api/quick-add-drafts/')) {
    const params={params:Promise.resolve({id:url.pathname.split('/').pop()})};
    response=method==='PATCH'?await backend.item.PATCH(body(),params):await backend.item.GET({},params);
   } else if(url.pathname.includes('notification')) response.body={notifications:[]};
   await route.fulfill({status:response.status,json:response.body});
  });
  await page.route('**/*.supabase.co/**',route=>route.abort());
  await page.goto('http://localhost:3107/admin/quick-add');
  await page.getByRole('heading',{name:'Saved drafts',exact:true}).waitFor();
  await page.getByRole('button',{name:'Reject non-essential',exact:true}).click();
  await page.getByRole('button',{name:'Quick Add',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Product name').fill('Delivery bread');
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
  await page.screenshot({path:`/tmp/ally-quick-add-${device}-saved.png`});
  await dialog.getByRole('button',{name:'Add another',exact:true}).click();
  assert.equal(await dialog.getByLabel('Product name').inputValue(),'');
  assert.equal(await dialog.getByLabel('Supplier name',{exact:true}).inputValue(),'New supplier');
  assert.equal(await dialog.getByLabel('Delivery notes').inputValue(),'');
  assert.equal(await dialog.getByLabel('Delivery location').inputValue(),uuid(5));
  await dialog.getByLabel('Product name').fill('Second product');
  page.once('dialog',prompt=>prompt.dismiss());
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await dialog.isVisible(),true);
  page.once('dialog',prompt=>prompt.accept());
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  await page.getByRole('link',{name:/open draft.*delivery bread/i}).click();
  await dialog.getByLabel('Product name').waitFor();
  assert.equal(await dialog.getByLabel('Product name').inputValue(),'Delivery bread');
  await dialog.getByLabel('Delivery notes').fill('Checked on desktop or phone');
  await page.screenshot({path:`/tmp/ally-quick-add-${device}-form.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  const saveBounds=await dialog.getByRole('button',{name:'Save draft',exact:true}).boundingBox();
  assert.ok(saveBounds.y>=0 && saveBounds.y+saveBounds.height<=height, 'Save remains visible without scrolling');
  await dialog.getByRole('button',{name:'Save draft',exact:true}).click();
  await dialog.getByText('Draft saved — not published',{exact:true}).waitFor();
  assert.equal(backend.rows[0].version,2);
  assert.equal(backend.rows[0].notes,'Checked on desktop or phone');
  assert.deepEqual(failures,[]);
  console.log(`PASS ${device}: create, failed-save retry, Add another, discard confirmation, list, reopen, edit; no page errors or horizontal overflow. Actual route handlers with fixture database.`);
  await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
