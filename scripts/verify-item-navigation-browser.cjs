// Verify navigation against a local production build. All API responses are fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')
const base = process.env.BASE_URL || 'http://localhost:3111'
const warnings = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key=>[key,'none']))
;(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  for(const language of ['en','de'])for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'})
   await context.addInitScript(language=>localStorage.setItem('defaultLanguage',language),language)
   await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000)
   page.on('pageerror',error=>errors.push(error.message))
   const labels=catalog[language],copy=labels.itemNavigation
   const raw=[['a','Test Alpha','A','2026-10-20'],['b','Test Beta','A','2026-10-22'],['c','Test Gamma','A','2026-10-21'],['d','Other','B','2026-10-23'],['source','Source','Sources','2026-10-01']].map(([id,name,category,created_at])=>({id,name,category,created_at,description:'Example',allergen_warnings:warnings,certifications:[],suppliers:[],supplier_profiles:{},status:'active',is_active:true,dietary:[],item_type:'prepared',ingredients:id==='b'?['source']:[]}))
   let slow=false,failList=false,collection='ingredients',listRequests=0
   await page.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;let data={}
    if(path==='/api/auth/session')data={authenticated:true,user:{id:'staff',name:'Staff',email:'fixture@example.invalid',role:'staff',businessId:'business'}}
    else if(path==='/api/business/business')data={settings:{defaultLanguage:language}}
    else if(path==='/api/ingredients'||path==='/api/menu-items'){
     if(path===(collection==='ingredients'?'/api/ingredients':'/api/menu-items')){
      listRequests++
      if(failList){await route.fulfill({status:503,json:{error:'Fixture unavailable'}});return}
     }
     data=path==='/api/ingredients'?{ingredients:raw,count:raw.length}:{menuItems:raw}
    }else if(/^\/api\/(ingredients|menu-items)\/[^/]+$/.test(path)){
     const id=path.split('/').at(-1)
     if(slow&&id==='c')await new Promise(resolve=>setTimeout(resolve,500))
     data={ [path.startsWith('/api/ingredients/')?'ingredient':'menuItem']:raw.find(row=>row.id===id) }
    }else if(path==='/api/datasheets'){
     const inherited=url.searchParams.get('ingredientIds')==='source'
     const own=url.searchParams.get('ingredient_id')==='b'||url.searchParams.get('menu_item_id')==='b'
     data={datasheets:inherited?[{id:'source-doc',ingredient_id:'source',file_name:'Source spec.pdf',file_path:'https://example.invalid/source.pdf',file_type:'application/pdf',file_size:100,uploaded_at:'2026-10-01'}]:own?[{id:'b-doc',file_name:'Own b.pdf',file_path:'https://example.invalid/b.pdf',file_type:'application/pdf',file_size:100,uploaded_at:'2026-10-01'}]:[]}
    }else if(path==='/api/sites')data={sites:[]}
    else if(path==='/api/suppliers')data={suppliers:[]}
    await route.fulfill({json:data})
   })
   const navigation=()=>page.getByRole('navigation',{name:copy.label,exact:true})
   const next=()=>navigation().getByRole('link',{name:copy.next,exact:true})
   const previous=()=>navigation().getByRole('link',{name:copy.previous,exact:true})
   for(collection of ['ingredients','menu-builder']){
    slow=false;failList=false;listRequests=0
    const list=`/admin/${collection}?q=Test&category=A&view=list&sort=date&direction=desc&filters=1`
    await page.goto(base+list)
    const first=page.locator(`main a[href^="/admin/${collection}/b?returnTo="]`).first()
    await first.waitFor();await first.click()
    await page.getByRole('heading',{name:'Test Beta',exact:true}).waitFor()
    const actualContext=new URL(page.url()).searchParams.get('returnTo')
    assert.equal(new URL(actualContext,base).searchParams.get('category'),'A')
    assert.equal(new URL(actualContext,base).searchParams.get('direction'),'desc')
    await next().waitFor()
    assert.equal(await navigation().getByRole('button',{name:copy.previous,exact:true}).isDisabled(),true)
    assert.equal(new URL(await next().getAttribute('href'),base).pathname,`/admin/${collection}/c`)
    assert.equal(new URL(await next().getAttribute('href'),base).searchParams.get('returnTo'),actualContext)
    if(collection==='menu-builder')await page.getByText('Source spec.pdf',{exact:true}).waitFor()
    slow=true
    await next().click();await page.waitForURL(url=>url.pathname===`/admin/${collection}/c`)
    await next().click();await page.waitForURL(url=>url.pathname===`/admin/${collection}/a`)
    await page.getByRole('heading',{name:'Test Alpha',exact:true}).waitFor()
    await page.waitForTimeout(550)
    assert.equal(await page.getByRole('heading',{name:'Test Gamma',exact:true}).count(),0,'late fetches never restore a previous item')
    assert.equal(await page.getByText('Own b.pdf',{exact:true}).count(),0)
    assert.equal(await page.getByText('Source spec.pdf',{exact:true}).count(),0,'previous ingredient datasheets are cleared')
    assert.equal(await navigation().getByRole('button',{name:copy.next,exact:true}).isDisabled(),true)
    slow=false
    await previous().click();await page.getByRole('heading',{name:'Test Gamma',exact:true}).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('returnTo'),actualContext)
    const back=page.getByRole('link',{name:collection==='ingredients'?labels.ingredientsPortal.backToIngredients:labels.admin.backToMenuBuilder,exact:true})
    assert.equal(await back.getAttribute('href'),actualContext)
    if(width===1440){
     const left=await previous().boundingBox(),right=await next().boundingBox()
     assert.ok(left.x<285&&right.x>width-75,'desktop controls stay at the left and right edges of the content area')
     await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight))
     assert.ok(Math.abs((await previous().boundingBox()).y-left.y)<2,'side controls stay available when scrolling')
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'navigation fits the viewport')
    await page.screenshot({path:`/tmp/item-navigation-${collection}-${language}-${width}.png`})
    await back.click();await page.waitForURL(url=>url.pathname===`/admin/${collection}`)
    assert.equal(new URL(page.url()).searchParams.get('q'),'Test')

    failList=true
    await page.goto(`${base}/admin/${collection}/b`)
    await navigation().getByText(copy.failed,{exact:true}).waitFor()
    assert.equal(await navigation().getByRole('button',{name:copy.next,exact:true}).isDisabled(),true)
    failList=false
    await navigation().getByRole('button',{name:labels.regularLists.retry,exact:true}).click()
    await next().waitFor()
    assert.equal(new URL(await next().getAttribute('href'),base).pathname,`/admin/${collection}/c`,'direct links use the default list order')
   }
   assert.deepEqual(errors,[])
   console.log(`PASS ${language} ${width}px: filtered order, previous/next boundaries, rapid navigation, datasheet isolation, back links and retry`)
   await context.close()
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
