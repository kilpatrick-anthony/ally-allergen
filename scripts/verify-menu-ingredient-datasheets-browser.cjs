// Production-build UI checks with isolated API fixtures; never changes live data.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')
const base = process.env.BASE_URL || 'http://localhost:3111'
const format = (text, values) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), text)
const warnings = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key=>[key,'none']))
;(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']})
 try {
  for (const language of ['en','de']) for (const width of [390,1440]) {
   const context = await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'})
   await context.addInitScript(language=>localStorage.setItem('defaultLanguage',language),language)
   await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
   const page=await context.newPage(), errors=[], mutations=[], reads=[]
   page.setDefaultTimeout(12000)
   page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept())
   const labels=catalog[language], copy=labels.menuDatasheets
   const ingredients=[['coffee','Coffee beans'],['milk','Oat drink'],['syrup','Vanilla syrup']].map(([id,name])=>({id,name,suppliers:['Source supplier'],supplier_profiles:{},certifications:[],status:'active',allergen_warnings:warnings}))
   const sheet=(id,name)=>({id,ingredient_id:id,file_name:name,file_path:`https://example.invalid/${id}.pdf`,file_type:'application/pdf',file_size:100,supplier_name:id==='coffee'?'Bean supplier':null,display_supplier_name:id==='milk'?'Drink supplier':null})
   const sheets=[sheet('coffee','Coffee spec.pdf'),sheet('milk','Oat spec.pdf')]
   const direct={id:'direct',file_name:'Finished recipe.pdf',file_path:'https://example.invalid/recipe.pdf',file_type:'application/pdf',file_size:100}
   const menu={id:'menu',name:'Coffee',description:'A prepared coffee',item_type:'prepared',ingredients:['coffee','milk'],allergen_warnings:warnings,dietary:[],is_active:true,status:'active'}
   let failNext=false, slowMilk=false, hasDirect=true
   await page.route('**/api/**',async route=>{
    const request=route.request(), url=new URL(request.url()), path=url.pathname
    let data={}
    if(request.method()!=='GET')mutations.push({path,method:request.method(),body:request.postData()})
    if(path==='/api/auth/session')data={authenticated:true,user:{id:'staff',email:'fixture@example.invalid',role:'staff',businessId:'business',name:'Staff'}}
    else if(path==='/api/business/business')data={settings:{defaultLanguage:language}}
    else if(path==='/api/ingredients')data={ingredients}
    else if(path==='/api/ingredients/categories')data={categories:[]}
    else if(path==='/api/suppliers')data={suppliers:[]}
    else if(path==='/api/sites')data={sites:[]}
    else if(path==='/api/menu-items/menu')data={menuItem:menu}
    else if(path==='/api/menu-items'&&request.method()==='POST')data={menuItem:{id:'saved'}}
    else if(path==='/api/menu-items')data={menuItems:[menu]}
    else if(path==='/api/datasheets'){
     if(url.searchParams.has('ingredientIds')){
      const ids=url.searchParams.get('ingredientIds').split(',');reads.push(ids)
      if(failNext){failNext=false;await route.fulfill({status:503,json:{error:'Fixture unavailable'}});return}
      if(slowMilk&&ids.includes('milk'))await new Promise(resolve=>setTimeout(resolve,500))
      data={datasheets:[...sheets.filter(sheet=>ids.includes(sheet.ingredient_id)),sheet('foreign','Secret spec.pdf')]}
     }else data={datasheets:hasDirect&&url.searchParams.has('menu_item_id')?[direct]:[]}
    }else if(path==='/api/upload/datasheet')data={datasheet:{id:'extra'}}
    else if(path==='/api/datasheets/direct'&&request.method()==='DELETE'){hasDirect=false;data={success:true}}
    await route.fulfill({json:data})
   })
   const go=async path=>{await page.goto(base+path);await page.locator('#regular-name').waitFor()}
   const choose=async names=>{
    await page.getByRole('button',{name:new RegExp(`^(${labels.admin.addIngredients}|${labels.admin.addMoreIngredients})$`)}).click()
    for(const name of names)await page.getByRole('checkbox',{name:new RegExp(name,'i')}).click()
    await page.getByRole('button',{name:labels.admin.done,exact:true}).click()
   }
   const remove=async name=>page.getByRole('button',{name:format(labels.regularForms.removeIngredient,{name}),exact:true}).click()
   const inherited=()=>page.getByRole('region',{name:copy.fromIngredients,exact:true})

   await go('/admin/menu-builder/new')
   await inherited().getByText(copy.selectIngredients,{exact:true}).waitFor()
   await choose(['Coffee beans','Oat drink','Vanilla syrup'])
   await inherited().getByText('Coffee spec.pdf',{exact:true}).waitFor()
   await inherited().getByText('Oat spec.pdf',{exact:true}).waitFor()
   assert.equal(await inherited().getByText(copy.missing,{exact:true}).count(),1)
   assert.ok(await inherited().getByText(/Bean supplier/).count())
   assert.ok(await inherited().getByText(/Drink supplier/).count())
   assert.equal(await inherited().getByText('Secret spec.pdf',{exact:true}).count(),0)
   assert.equal(mutations.length,0,'ingredient datasheets appear before any save')
   assert.equal(await inherited().getByRole('button').count(),0,'inherited documents are read-only')
   assert.equal(await inherited().getByRole('link',{name:copy.open+': Coffee spec.pdf',exact:true}).getAttribute('href'),'https://example.invalid/coffee.pdf')
   await remove('Oat drink')
   await inherited().getByText('Coffee spec.pdf',{exact:true}).waitFor()
   assert.equal(await inherited().getByText('Oat spec.pdf',{exact:true}).count(),0)
   slowMilk=true
   await choose(['Oat drink'])
   await remove('Oat drink')
   await inherited().getByText('Coffee spec.pdf',{exact:true}).waitFor()
   await page.waitForTimeout(600)
   assert.equal(await inherited().getByText('Oat spec.pdf',{exact:true}).count(),0,'late responses cannot restore removed ingredient documents')
   slowMilk=false;failNext=true
   await remove('Vanilla syrup')
   await inherited().getByRole('alert').waitFor()
   assert.equal(await inherited().getByText(copy.missing,{exact:true}).count(),0,'loading failures are not presented as missing documents')
   await inherited().getByRole('button',{name:labels.regularLists.retry,exact:true}).click()
   await inherited().getByText('Coffee spec.pdf',{exact:true}).waitFor()
   await page.locator('#regular-name').fill('Prepared coffee')
   await page.locator('#regular-description').fill('Coffee made from beans')
   await page.getByText(copy.noExtra,{exact:true}).waitFor()
   await page.getByRole('button',{name:labels.admin.saveChanges,exact:true}).click()
   await page.waitForURL('**/admin/menu-builder')
   assert.deepEqual(JSON.parse(mutations.find(write=>write.path==='/api/menu-items').body).ingredients,['coffee'])
   assert.equal(mutations.filter(write=>write.path.includes('datasheet')).length,0,'saving a recipe never copies or reuploads ingredient documents')

   mutations.length=0
   await go('/admin/menu-builder/menu/edit')
   await inherited().getByText('Coffee spec.pdf',{exact:true}).waitFor()
   await inherited().getByText('Oat spec.pdf',{exact:true}).waitFor()
   await page.getByText('Finished recipe.pdf',{exact:true}).waitFor()
   await page.getByRole('button',{name:format(labels.ingredientsPortal.removeFile,{fileName:'Finished recipe.pdf'}),exact:true}).click()
   await page.getByRole('button',{name:labels.admin.saveMenuItem,exact:true}).click()
   await page.waitForURL('**/admin/menu-builder')
   assert.deepEqual(mutations.filter(write=>write.path.includes('datasheet')).map(write=>[write.method,write.path]),[['DELETE','/api/datasheets/direct']],'editing extra documents cannot modify inherited documents')
   await go('/admin/menu-builder/new?type=packaged_product')
   await page.getByRole('heading',{name:copy.productTitle,exact:true}).waitFor()
   assert.equal(await inherited().count(),0,'bought-in items retain their own product uploader')
   assert.deepEqual(errors,[])
   assert.ok(reads.length>0)
   await page.screenshot({path:`/tmp/menu-ingredient-datasheets-${language}-${width}.png`,fullPage:true})
   console.log(`PASS ${language} ${width}px: automatic ingredient documents, missing/retry states, selection races, live saves and independent extra documents`)
   await context.close()
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
