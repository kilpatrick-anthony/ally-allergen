// Run against a local production build. API responses and writes are isolated fixtures.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const assert=require('node:assert/strict')
const catalog=require('../tests/helpers/translation-catalog.cjs')
const base=process.env.BASE_URL||'http://localhost:3111'
const warnings=Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(k=>[k,'none']))
;(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{for(const language of ['en','de'])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'})
  await context.addInitScript(language=>{localStorage.setItem('defaultLanguage',language);sessionStorage.setItem('jencoach_dismissed','true')},language)
  await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
  const page=await context.newPage(),errors=[],writes=[];page.setDefaultTimeout(15000)
  page.on('pageerror',error=>errors.push(error.message))
  page.on('dialog',dialog=>dialog.accept())
  let records
  const reset=()=>records=[['coffee','Test Coffee',''],['oat','Test Oat','Milks'],['soy','Test Soy','Milks'],['vanilla','Test Vanilla','Syrups']].map(([id,name,subcategory])=>({id,name,subcategory,category:'Drinks',description:'Example',business_id:'business',allergen_warnings:warnings,certifications:[],suppliers:[],supplier_profiles:{},status:'active',is_active:true,dietary:[],ingredients:['coffee'],item_type:'prepared',created_at:'2026-10-01',price:0,display_order:0}))
  reset()
  await page.route('**/*.supabase.co/**',route=>route.abort())
  await page.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url()),p=url.pathname;let data={},status=200
   if(p==='/api/auth/session')data={authenticated:true,user:{id:'staff',name:'Staff',email:'fixture@example.invalid',role:'staff',businessId:'business'}}
   else if(p==='/api/business/business')data={settings:{defaultLanguage:language}}
   else if(p==='/api/kiosk/data')data={business:{id:'business',name:'Rio',default_language:language},menuItems:records,ingredients:records}
   else if(p.endsWith('/categories')){
    if(request.method()==='PATCH'){
     const body=request.postDataJSON();writes.push({p,body})
     if(body.name==='Existing'){status=409;data={errorCode:'nameExists'}}
     else{for(const item of records)if(item.category===body.category&&(body.subcategory===undefined||item.subcategory===body.subcategory))item[body.subcategory===undefined?'category':'subcategory']=body.name;data={updatedCount:records.length}}
    }else data={categories:[...new Set(records.map(x=>x.category))],subcategories:{Drinks:['Milks','Syrups']}}
   }else if(p==='/api/menu-items'||p==='/api/ingredients'){
    if(['POST','PUT'].includes(request.method())){writes.push({p,body:request.postDataJSON()});data={menuItem:{id:'saved'},ingredient:{id:'saved'}}}
    else data={menuItems:records,ingredients:records,count:records.length}
   }else if(/^\/api\/(menu-items|ingredients)\/[^/]+$/.test(p)){
    if(request.method()==='PUT'){writes.push({p,body:request.postDataJSON()});data={menuItem:{id:'saved'},ingredient:{id:'saved'}}}
    else{const item=records.find(x=>x.id===p.split('/').at(-1));data={menuItem:item,ingredient:item}}
   }else if(p==='/api/sites')data={sites:[]}
   else if(p==='/api/suppliers')data={suppliers:[]}
   else if(p==='/api/datasheets')data={datasheets:[]}
   else if(p.includes('notification'))data={notifications:[]}
   await route.fulfill({json:data,status})
  })
  const t=catalog[language],copy=t.categoryManagement
  for(const coll of ['ingredients','menu-builder']){
   for(const view of ['grid','list']){
    reset();await page.goto(`${base}/admin/${coll}?view=${view}`)
    await page.getByText('Test Vanilla',{exact:true}).first().waitFor()
    const main=page.locator('main'),text=await main.innerText()
    assert.ok(text.indexOf('Test Coffee')<text.indexOf('Milks'))
    assert.ok(text.indexOf('Test Soy')<text.indexOf('Syrups'))
    await page.getByRole('button',{name:`${copy.renameSubcategory}: Milks`,exact:true}).click()
    const modal=page.getByRole('dialog');await modal.getByRole('textbox',{name:copy.name,exact:true}).fill('Existing')
    await modal.getByRole('button',{name:copy.save,exact:true}).click()
    await modal.getByRole('alert').filter({hasText:copy.nameExists}).waitFor()
    await modal.getByRole('textbox',{name:copy.name,exact:true}).fill('Milk options')
    await modal.getByRole('button',{name:copy.save,exact:true}).click()
    await page.getByRole('button',{name:`${copy.renameSubcategory}: Milk options`,exact:true}).waitFor()
    await page.getByRole('button',{name:`${copy.rename}: Drinks`,exact:true}).click()
    await page.getByRole('dialog').getByRole('textbox',{name:copy.name,exact:true}).fill('Beverages')
    await page.getByRole('dialog').getByRole('button',{name:copy.save,exact:true}).click()
    await page.getByRole('button',{name:`${copy.rename}: Beverages`,exact:true}).waitFor()
    assert.equal(records.filter(x=>x.category==='Beverages').length,4)
    assert.equal(records.filter(x=>x.subcategory==='Milk options').length,2)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'fits viewport')
    await page.screenshot({path:`/tmp/item-categories-${coll}-${view}-${language}-${width}.png`})
   }
   reset()
   for(const edit of [false,true]){
    await page.goto(`${base}/admin/${coll}/${edit?'oat/edit':'new'}`)
    await page.locator('#regular-category').waitFor()
    const sub=page.getByLabel(copy.subcategory,{exact:true})
    if(edit){assert.equal(await sub.inputValue(),'Milks')}
    else{await page.locator('#regular-name').fill('New item');if(coll==='menu-builder'){await page.locator('#regular-description').fill('Example')}}
    await page.locator('#regular-category').fill('Drinks');await sub.fill('Sweeteners')
    assert.equal(await sub.inputValue(),'Sweeteners')
    assert.equal(await page.locator('datalist option[value="Milks"]').count(),1)
    if(edit){
     await page.getByRole('button',{name:coll==='ingredients'?t.admin.saveChanges:t.admin.saveMenuItem,exact:true}).click()
     await page.waitForURL(url=>!url.pathname.endsWith('/edit'))
     assert.equal(writes.at(-1).body.subcategory,'Sweeteners')
    }
    // Changing parent clears the previous child group.
    if(!edit){await page.locator('#regular-category').fill('Food');assert.equal(await sub.inputValue(),'')}
   }
  }
  reset();await page.goto(`${base}/kiosk/rio`)
  await page.getByRole('button',{name:t.clickHereToBegin,exact:true}).click()
  // Search switches the kiosk to its menu view on both screen sizes.
  if(width<768)await page.getByRole('button',{name:t.kioskPortal.openMenu,exact:true}).click()
  await page.getByPlaceholder(t.searchMenuItems).filter({visible:true}).fill('Test')
  await page.getByRole('button',{name:t.cardsView,exact:true}).click()
  await page.getByRole('heading',{name:'Milks',exact:true}).waitFor()
  await page.getByRole('heading',{name:'Syrups',exact:true}).waitFor()
  await page.screenshot({path:`/tmp/item-categories-kiosk-${language}-${width}.png`})
  if(width>=768){await page.getByRole('button',{name:t.tableView,exact:true}).click();await page.getByRole('cell',{name:'Milks',exact:true}).first().waitFor()}
  assert.deepEqual(errors,[])
  console.log(`PASS ${language} ${width}px: admin grid/list renaming, collision feedback, parent/child forms, saves and kiosk grouping`)
  await context.close()
 }}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
