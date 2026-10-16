// Sample-only workflow checks: every API request is intercepted; no live writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')
const base = process.env.REVIEW_BASE_URL || 'http://localhost:3111'
;(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  let activePage
  try {
    for(const language of (process.env.REVIEW_LANGUAGES || 'en,de').split(',')) for(const width of (process.env.REVIEW_WIDTHS || '390,1440').split(',').map(Number)) {
      const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:900}})
      const page=await context.newPage(), labels=catalog[language], errors=[], writes=[]
      activePage=page
      let draft=null, documents=[], failUpload=true, failActivation=true
      const uploads=new Map()
      page.setDefaultTimeout(15000)
      page.on('pageerror',error=>errors.push(error.message))
      page.on('dialog',dialog=>dialog.dismiss())
      await context.addInitScript(language=>{localStorage.setItem('defaultLanguage',language);sessionStorage.setItem('jencoach_dismissed','true')},language)
      await page.route('**/*.supabase.co/**',route=>route.abort())
      await page.route('**/api/**',async route=>{
        const request=route.request(), pathname=new URL(request.url()).pathname, method=request.method()
        let data={}, status=200
        if(method!=='GET') writes.push({pathname,method})
        if(pathname==='/api/auth/session') data={authenticated:true,user:{id:'fixture-user',name:'Reviewer',email:'review@example.invalid',role:'owner',businessId:'fixture-business'}}
        else if(pathname.startsWith('/api/business/')) data={settings:{defaultLanguage:language},business:{name:'Sample kitchen'}}
        else if(pathname==='/api/ingredient-drafts') data={drafts:draft && !draft.ingredient_id ? [draft] : []}
        else if(/^\/api\/ingredient-drafts\/[^/]+\/activate$/.test(pathname)) {
          if(failActivation){failActivation=false;status=503;data={error:'Temporary activation failure'}}
          else {draft.ingredient_id='active-ingredient';data={ingredient:{id:'active-ingredient'}}}
        } else if(/^\/api\/ingredient-drafts\/[^/]+\/documents$/.test(pathname)) {
          const body=request.postDataBuffer().toString(), name=body.includes('second.pdf')?'second.pdf':'first.pdf'
          uploads.set(name,(uploads.get(name)||0)+1)
          if(name==='second.pdf' && failUpload){failUpload=false;status=503;data={error:'Temporary upload failure'}}
          else {const doc={id:name,file_name:name,file_size:10,file_type:'application/pdf'};documents.push(doc);data={datasheet:doc}}
        } else if(/^\/api\/ingredient-drafts\/[^/]+$/.test(pathname)) {
          if(method==='PUT') {const body=request.postDataJSON();draft={id:pathname.split('/').at(-1),payload:body.payload,version:(draft?.version||0)+1};data={draft}}
          else data={draft,datasheets:documents}
        } else if(pathname==='/api/ingredients') data={ingredients:[],count:0}
        else if(pathname==='/api/suppliers') data={suppliers:[]}
        else if(pathname.includes('categories')) data={categories:[]}
        else if(pathname.includes('notification')) data={notifications:[]}
        else if(pathname==='/api/compliance/status') data={status:'error',reasons:[]}
        await route.fulfill({status,json:data})
      })
      const saveDraft=async()=>{
        const retry=page.getByRole('button',{name:labels.regularItemSave.saveAndRetry,exact:true})
        await (await retry.isVisible()?retry:page.getByRole('button',{name:labels.regularAssessment.saveDraft,exact:true})).click()
      }
      const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow')
      await page.goto(`${base}/admin/ingredients/new?returnTo=${encodeURIComponent('/admin/ingredients?q=oats')}`)
      const cookie = page.getByRole('button', { name: labels.cookieConsent.rejectNonEssential, exact: true })
      await cookie.waitFor({state:'visible',timeout:3000}).catch(()=>{})
      if (await cookie.isVisible()) await cookie.click()
      await saveDraft()
      assert.equal(writes.length,0)
      await page.locator('#regular-name').fill('Unfinished oats')
      await page.locator('input[type=file]').setInputFiles(['first.pdf','second.pdf'].map(name=>({name,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nfixture')})))
      await saveDraft()
      await page.getByRole('alert').filter({hasText:labels.ingredientDrafts.documentsPending}).first().waitFor()
      assert.deepEqual(draft.payload.allergen_warnings,{})
      await overflow()
      await saveDraft()
      await page.waitForURL('**/admin/ingredients?q=oats')
      assert.equal(uploads.get('first.pdf'),1);assert.equal(uploads.get('second.pdf'),2)
      await page.getByRole('link',{name:`${labels.ingredientDrafts.resume}: Unfinished oats`,exact:true}).click()
      await page.getByRole('heading',{name:labels.ingredientDrafts.edit,exact:true}).waitFor()
      await page.getByText('first.pdf',{exact:true}).waitFor()
      await page.getByText('second.pdf',{exact:true}).waitFor()
      await page.getByRole('button',{name:labels.regularAssessment.makeActive,exact:true}).click()
      assert.equal(writes.some(write=>write.pathname.endsWith('/activate')),false)
      for(const key of ['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs']) await page.getByLabel(labels.allergenNames[key],{exact:true}).selectOption('none')
      await page.getByRole('button',{name:labels.regularAssessment.makeActive,exact:true}).click()
      await page.getByRole('alert').filter({hasText:'Temporary activation failure'}).first().waitFor()
      assert.equal(await page.locator('#regular-name').inputValue(),'Unfinished oats')
      await page.evaluate(()=>document.documentElement.classList.add('dark'))
      await overflow()
      await page.getByRole('button',{name:labels.regularAssessment.makeActive,exact:true}).click()
      await page.waitForURL('**/admin/ingredients?q=oats')
      await page.locator('summary').filter({hasText:labels.ingredientDrafts.title}).click()
      await page.getByText(labels.ingredientDrafts.empty,{exact:true}).waitFor()
      assert.equal(uploads.get('first.pdf'),1);assert.equal(uploads.get('second.pdf'),2)
      assert.equal(new Set(writes.filter(write=>write.method==='PUT').map(write=>write.pathname)).size,1)
      assert.equal(writes.some(write=>write.pathname==='/api/ingredients'),false)
      assert.deepEqual(errors,[])
      console.log(`${language} ${width}px: incomplete save, upload retry, reopen, activation validation/retry and list context passed`)
      await context.close()
    }
  } catch(error) {
    if(activePage) {console.error(await activePage.locator('body').innerText());await activePage.screenshot({path:'/tmp/ingredient-draft-browser-failure.png',fullPage:true})}
    throw error
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
