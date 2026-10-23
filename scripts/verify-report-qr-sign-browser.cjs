// Local production build; every API request uses fixtures and never changes business data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const assert=require('node:assert/strict'),fs=require('node:fs')
const catalog=require('../tests/helpers/translation-catalog.cjs')
const base=process.env.BASE_URL||'http://localhost:3111'
;(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const manifest=[]
 try{for(const language of (process.env.REVIEW_LANGUAGES||'en,ga,de').split(','))for(const width of (process.env.REVIEW_WIDTHS||'390,1440').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:950},acceptDownloads:true,serviceWorkers:'block'})
  await context.addInitScript(language=>{localStorage.setItem('defaultLanguage',language);sessionStorage.setItem('jencoach_dismissed','true')},language)
  await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000)
  page.on('pageerror',error=>errors.push(error.message))
  const labels=catalog[language],copy=labels.qrSign
  let failLoad=true
  const initial=[{id:'door',name:'Front door',site_id:'site-one',public_code:'door-code',status:'active',site:{name:'Main store'}},{id:'counter',name:'Counter',site_id:'site-two',public_code:'counter-code',status:'active',site:{name:'Second store'}},{id:'old',name:'Old code',site_id:'site-one',public_code:'old-code',status:'inactive',site:{name:'Main store'}}]
  let records=initial.map(x=>({...x,scan_count:0,last_scanned_at:null,created_at:'2026-10-01'}))
  await page.route('**/*.supabase.co/**',route=>route.abort())
  await page.route('**/api/**',async route=>{
   const request=route.request(),p=new URL(request.url()).pathname;let data={},status=200
   if(p==='/api/auth/session')data={authenticated:true,user:{id:'staff',name:'Staff',email:'fixture@example.invalid',role:'staff',businessId:'business'}}
   else if(p==='/api/business/data')data={business:{id:'business',name:'Rio'},sites:[],menuItems:[],ingredients:[],suppliers:[]}
   else if(p==='/api/qr-codes'){
    if(failLoad){status=503;data={error:labels.accessPoints.loadError}}else data={qrCodes:records,businessSlug:'rio',planType:'starter'}
   }else if(p.startsWith('/api/qr-codes/')&&request.method()==='PUT'){
    const item=records.find(x=>x.id===p.split('/').at(-1));item.status=request.postDataJSON().status;data={qrCode:item}
   }else if(p==='/api/sites')data={sites:[]}
   else if(p.startsWith('/api/business/'))data={settings:{defaultLanguage:language}}
   else if(p.includes('notification'))data={notifications:[]}
   await route.fulfill({json:data,status})
  })
  await page.goto(base+'/admin/downloads')
  const panel=page.getByRole('region',{name:copy.title,exact:true})
  await panel.getByRole('alert').waitFor()
  failLoad=false;await panel.getByRole('button',{name:copy.retry,exact:true}).click()
  const select=panel.getByLabel(copy.choose,{exact:true})
  try { await select.waitFor() } catch (error) { fs.writeFileSync('/tmp/report-sign-debug.html',await panel.innerHTML());await page.screenshot({path:'/tmp/report-sign-debug.png'});console.log('page errors',errors);throw error }
  assert.equal(await select.locator('option').count(),2,'inactive codes excluded')
  assert.ok((await panel.boundingBox()).y<500,'download panel is prominent near the top')
  await select.selectOption('counter')
  const downloadPromise=page.waitForEvent('download')
  await panel.getByRole('button',{name:copy.download,exact:true}).click()
  const download=await downloadPromise,path=`/tmp/report-sign-${language}-${width}.pdf`
  await download.saveAs(path)
  assert.equal(download.suggestedFilename(),'counter-sign.pdf')
  assert.equal(await panel.getByRole('button',{name:copy.download,exact:true}).isEnabled(),true)
  manifest.push({path,url:`${base}/kiosk/rio?site_id=site-two&qr=counter-code`})
  assert.equal(await panel.getByRole('link',{name:copy.manage,exact:true}).getAttribute('href'),'/admin/qr-codes')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'report fits viewport')
  await page.screenshot({path:`/tmp/report-sign-${language}-${width}.png`})
  await page.goto(base+'/admin/qr-codes')
  await page.locator('[data-qr-actions]').first().waitFor()
  const checkButtons=async()=>{
   const clipped=await page.locator('[data-qr-actions] button').evaluateAll(buttons=>buttons.filter(button=>button.scrollWidth>button.clientWidth+1).map(button=>button.textContent))
   assert.deepEqual(clipped,[],'QR action labels fit inside their buttons')
   const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)
   if(!fits){await page.screenshot({path:'/tmp/qr-actions-overflow.png'});console.log(await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,text:e.textContent.slice(0,90),width:e.getBoundingClientRect().width,class:e.className}))))}
   assert.ok(fits,'QR actions fit viewport')
  }
  await checkButtons()
  const actions=page.locator('[data-qr-actions]').first()
  await actions.getByRole('button',{name:labels.accessPoints.deactivate,exact:true}).click()
  await actions.getByRole('button',{name:labels.accessPoints.activate,exact:true}).waitFor()
  await checkButtons()
  await actions.getByRole('button',{name:labels.accessPoints.activate,exact:true}).click()
  await actions.getByRole('button',{name:labels.accessPoints.deactivate,exact:true}).waitFor()
  await page.screenshot({path:`/tmp/qr-actions-${language}-${width}.png`})
  records=[];await page.goto(base+'/admin/downloads')
  await panel.getByText(copy.empty,{exact:true}).waitFor()
  assert.equal(await panel.getByRole('button',{name:copy.download,exact:true}).count(),0)
  assert.deepEqual(errors,[])
  console.log(`PASS ${language} ${width}px: prominent reporting download, code selection, retry/empty states and unclipped activate/deactivate buttons`)
  await context.close()
 }}finally{fs.writeFileSync('/tmp/report-sign-manifest.json',JSON.stringify(manifest));await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
