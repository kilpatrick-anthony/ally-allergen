// Run against a local production build with isolated API fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')
const base = process.env.BASE_URL || 'http://localhost:3111'
const warnings = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key => [key, 'none']))
;(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']})
 try {
  for (const language of ['en', 'de']) for (const width of [390,1440]) {
   const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'})
   await context.addInitScript(language => localStorage.setItem('defaultLanguage',language),language)
   await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
   const page=await context.newPage(), errors=[], requests=[], saves=[]
   page.setDefaultTimeout(15000)
   await page.clock.install({time:new Date('2026-10-22T12:00:00Z')})
   page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept())
   const ingredient={id:'ingredient',name:'Rio ingredient',description:'Ingredient',allergen_warnings:warnings,suppliers:[],supplier_profiles:{},certifications:[],status:'active',created_at:'2025-01-01',updated_at:'2025-01-01',preferred_review_months:3}
   const menu={id:'menu',name:'Rio packaged item',description:'Packaged product',item_type:'packaged_product',supplier_id:'supplier',manufacturer:'Rio Brand',ingredient_declaration:'Water',allergen_warnings:warnings,dietary:[],ingredients:[],status:'active',is_active:true,created_at:'2026-10-21',updated_at:'2026-10-21'}
   await page.route('**/api/**',async route=>{
    const req=route.request(), url=new URL(req.url()), p=url.pathname;requests.push(p)
    let data={}
    if(p==='/api/auth/session')data={authenticated:true,user:{id:'staff',email:'fixture@example.invalid',role:'staff',businessId:'business',name:'Staff'}}
    else if(p==='/api/business/data')data={business:{id:'business',name:'Rio'},ingredients:[ingredient],menuItems:[menu],suppliers:[{id:'supplier',name:'Rio Supplier'}],sites:[]}
    else if(p==='/api/business/business')data={settings:{defaultLanguage:language}}
    else if(p==='/api/dashboard/summary')data={stats:{ingredients:1,menuItems:1,sites:1,suppliers:1,datasheets:0},business:{id:'business',name:'Rio'}}
    else if(p==='/api/ingredients/categories')data={categories:[]}
    else if(p==='/api/ingredients' && req.method()==='GET')data={ingredients:[ingredient],count:1}
    else if(p==='/api/ingredients/ingredient')data={ingredient}
    else if(p==='/api/menu-items' && req.method()==='GET')data={menuItems:[menu]}
    else if(p==='/api/menu-items/menu')data={menuItem:menu}
    else if(['/api/ingredients','/api/menu-items'].includes(p)&&req.method()==='POST'){
      const body=req.postDataJSON();saves.push({path:p,body});data=p==='/api/ingredients'?{ingredient:{...body,id:'new'}}:{menuItem:{...body,id:'new'}}
    }
    else if(p==='/api/sites')data={sites:[]}
    else if(p==='/api/suppliers')data={suppliers:[{id:'supplier',name:'Rio Supplier'}]}
    else if(p==='/api/datasheets')data={datasheets:[]}
    else if(p==='/api/fsai-alerts')data={alerts:[]}
    await route.fulfill({json:data})
   })
   const t=catalog[language]
   for(const path of ['/admin/ingredients','/admin/menu-builder','/admin/suppliers','/admin/sites']){
    await page.goto(base+path);await page.locator('h1').waitFor()
    assert.equal(await page.locator('main a[href*="/new"]').count(),0,`${path}: only floating launcher creates records`)
    assert.equal(await page.locator('a[href="/admin/compliance"], a[href="/admin/quick-add"]').count(),0)
    assert.equal(await page.getByRole('button',{name:t.quickAdd.addMenuTitle,exact:true}).count(),1)
   }
   await page.goto(base+'/admin/menu-builder')
   await page.getByRole('button',{name:t.admin.duplicate,exact:true}).first().click()
   await page.waitForResponse(response=>response.url().endsWith('/api/menu-items')&&response.request().method()==='GET')
   const duplicate=saves.find(s=>s.body.duplicate_from_id==='menu')
   assert.ok(duplicate);assert.equal(duplicate.body.manufacturer,'Rio Brand');assert.equal(duplicate.body.supplier_id,'supplier');assert.equal(duplicate.body.status,'active')
   await page.getByRole('button',{name:t.quickAdd.addMenuTitle,exact:true}).click()
   await page.getByRole('button',{name:t.quickAdd.addProduct,exact:true}).click()
   await page.waitForURL('**/admin/menu-builder/new?type=packaged_product')
   await page.locator('#regular-supplier').waitFor()
   assert.equal(await page.getByRole('button',{name:t.regularAssessment.saveDraft,exact:true}).count(),0)
   assert.equal(await page.locator('#regular-label-check').count(),0)
   await page.locator('#regular-name').fill('New Rio product')
   await page.locator('#regular-description').fill('Bought-in product')
   await page.locator('#regular-supplier').selectOption('supplier')
   await page.locator('#regular-declaration').fill('Water')
   const selects=page.locator('select[data-allergen-input]')
   for(let index=0;index<await selects.count();index++)await selects.nth(index).selectOption('none')
   await page.getByRole('button',{name:t.admin.saveChanges,exact:true}).click()
   await page.waitForURL('**/admin/menu-builder')
   assert.equal(saves.at(-1).body.status,'active')
   await page.goto(base+'/admin/ingredients/new')
   await page.locator('#regular-name').fill('New Rio ingredient')
   const ingredientSelects=page.locator('select[data-allergen-input]')
   for(let index=0;index<await ingredientSelects.count();index++)await ingredientSelects.nth(index).selectOption('none')
   assert.equal(await page.locator('[data-review-profile]').count(),0)
   await page.getByRole('button',{name:t.admin.saveChanges,exact:true}).click()
   await page.waitForURL('**/admin/ingredients')
   assert.equal(saves.at(-1).path,'/api/ingredients')
   await page.goto(base+'/admin/downloads');await page.locator('h1').waitFor()
   assert.equal(await page.getByText(t.admin.complianceReportTitle,{exact:true}).count(),0)
   assert.equal(await page.getByText(t.corePortal.auditTrailReport,{exact:true}).count(),1)
   await page.goto(base+'/admin/compliance');await page.waitForURL(base+'/admin')
   await page.getByRole('heading',{name:t.reminders.title,exact:true}).waitFor()
   await page.locator('a[href="/admin/ingredients/ingredient/edit"]').waitFor()
   await page.goto(base+'/admin/quick-add');await page.waitForURL(base+'/admin/ingredients')
   assert.ok(!requests.some(p=>/^\/api\/(compliance|ingredient-drafts|quick-add-drafts|quick-add-notifications)/.test(p)), 'no retired background processes')
   assert.deepEqual(errors,[])
   console.log(`PASS ${language} ${width}px: floating creation, live staff saves, full duplication, audit report, reminders, retired routes`)
   await context.close()
  }
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
