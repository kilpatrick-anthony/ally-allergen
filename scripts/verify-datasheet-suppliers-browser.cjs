// Read-only interface fixtures. API and Supabase requests never reach live data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const assert=require('node:assert/strict')
const catalog=require('../tests/helpers/translation-catalog.cjs')
;(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  let activePage
  try{
    for(const language of (process.env.REVIEW_LANGUAGES||'en').split(','))for(const width of [390,1440]){
      const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:900}})
      const page=await context.newPage(),errors=[],writes=[],labels=catalog[language]
      activePage=page
      page.on('pageerror',error=>{errors.push(error.message);console.error('pageerror',error.message)})
      await context.addInitScript(language=>{localStorage.setItem('defaultLanguage',language);sessionStorage.setItem('jencoach_dismissed','true')},language)
      const warnings=Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key=>[key,'none']))
      const ingredient={id:'fixture-ingredient',name:'Fixture ingredient',allergen_warnings:warnings,suppliers:['Current supplier'],certifications:[],status:'active',created_at:'2026-10-15T12:00:00Z',updated_at:'2026-10-15T12:00:00Z'}
      const files=prefix=>[
        {id:prefix+'old',file_name:prefix+'-old.pdf',file_size:1048576,supplier_name:'Historical supplier',display_supplier_name:'Current supplier',version:'2'},
        {id:prefix+'new',file_name:prefix+'-new.pdf',file_size:1048576,supplier_name:null,display_supplier_name:'Current supplier'},
        {id:prefix+'unknown',file_name:prefix+'-unknown.pdf',file_size:1048576,supplier_name:null,display_supplier_name:null},
        {id:prefix+'long',file_name:prefix+'-long.pdf',file_size:1048576,supplier_name:'Long supplier name '.repeat(12).trim()},
      ].map(sheet=>({...sheet,ingredient_id:prefix==='ingredient'?ingredient.id:null,file_path:'/fixture-evidence.pdf'}))
      await page.route('**/*.supabase.co/**',route=>route.abort())
      await page.route('**/api/**',async route=>{
        const request=route.request(),url=new URL(request.url()),p=url.pathname
        if(request.method()!=='GET')writes.push(p)
        let data={}
        if(p==='/api/auth/session')data={authenticated:true,user:{id:'fixture-user',name:'Reviewer',email:'review@example.invalid',role:'owner',businessId:'fixture-business'}}
        else if(p.startsWith('/api/business/'))data={settings:{defaultLanguage:language},business:{name:'Sample kitchen'}}
        else if(p==='/api/ingredients/fixture-ingredient')data={ingredient}
        else if(p==='/api/ingredients')data={ingredients:[ingredient]}
        else if(p==='/api/menu-items/fixture-menu')data={menuItem:{id:'fixture-menu',name:'Fixture menu item',description:'Fixture recipe',item_type:'prepared',ingredients:[ingredient.id],allergen_warnings:warnings,dietary:[],is_active:true,status:'active'}}
        else if(p==='/api/datasheets')data={datasheets:files(url.searchParams.has('menu_item_id')?'menu':'ingredient')}
        else if(p.includes('notifications'))data={notifications:[]}
        else if(p.includes('history'))data={history:[]}
        else if(p==='/api/compliance/status')data={status:'compliant',reasons:[]}
        await route.fulfill({json:data})
      })
      for(const path of ['/admin/ingredients/fixture-ingredient','/admin/menu-builder/fixture-menu']){
        await page.goto((process.env.REVIEW_BASE_URL||'http://localhost:3111')+path)
        const cookie=page.getByRole('button',{name:labels.cookieConsent.rejectNonEssential,exact:true})
        await cookie.waitFor({state:'visible',timeout:2000}).catch(()=>{})
        if(await cookie.isVisible())await cookie.click()
        for(const prefix of path.includes('menu-builder')?['menu','ingredient']:['ingredient'])for(const [suffix,text]of [['old','Historical supplier'],['new','Current supplier'],['unknown',labels.ingredientsPortal.supplierNotRecorded],['long','Long supplier name '.repeat(12).trim()]]){
          const filename=page.getByText(`${prefix}-${suffix}.pdf`,{exact:true})
          await filename.scrollIntoViewIfNeeded()
          const row=filename.locator('..')
          await row.getByText(text,{exact:true}).waitFor()
          assert.ok((await row.innerText()).includes('1.00'),'file size remains visible')
          if(suffix==='old')assert.equal(await row.getByText('Current supplier',{exact:true}).count(),0,'historical supplier preserved')
        }
        for(const theme of ['light','dark']){
          await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme)
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow')
        }
      }
      assert.deepEqual(errors,[]);assert.deepEqual(writes,[])
      console.log(`${language} ${width}px: ingredient, menu and linked-ingredient datasheet suppliers passed`)
      await context.close()
    }
  }catch(error){if(activePage){console.error(await activePage.locator('body').innerText());await activePage.screenshot({path:'/tmp/datasheet-supplier-failure.png',fullPage:true})}throw error}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
