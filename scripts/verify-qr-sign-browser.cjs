// Local production build; business data is mocked and no real records are changed.
const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const assert=require('node:assert/strict'),fs=require('node:fs')
const base=process.env.BASE_URL||'http://localhost:3111'
;(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const manifest=[]
 try{for(const [width,slug]of [[390,'rio'],[1440,'another-business']]){
  const context=await browser.newContext({viewport:{width,height:950},acceptDownloads:true,serviceWorkers:'block'})
  await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
  const page=await context.newPage(),errors=[];let failTemplate=false
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/Template%20-%20QR.pdf',route=>failTemplate?route.fulfill({status:503,body:'Unavailable'}):route.continue())
  const records=[{id:'door',site_id:'site-one',public_code:'front-door',name:'Front Door',site:{id:'site-one',name:'Main store'}},{id:'counter',site_id:'site-two',public_code:'counter-code',name:'Counter',site:{id:'site-two',name:'Second store'}}].map(x=>({...x,status:'active',placement:'',scan_count:0,last_scanned_at:null,created_at:'2026-10-01'}))
  await page.route('**/api/**',async route=>{
   const p=new URL(route.request().url()).pathname;let data={}
   if(p==='/api/auth/session')data={authenticated:true,user:{id:'staff',name:'Staff',email:'fixture@example.invalid',role:'owner',businessId:'business'}}
   else if(p==='/api/qr-codes')data={qrCodes:records,businessSlug:slug,planType:'starter'}
   else if(p==='/api/sites')data={sites:records.map(x=>x.site)}
   else if(p.startsWith('/api/business/'))data={settings:{defaultLanguage:'en'}}
   else if(p.includes('notification'))data={notifications:[]}
   await route.fulfill({json:data})
  })
  await page.goto(base+'/admin/qr-codes')
  for(let index=0;index<records.length;index++){
   const downloadPromise=page.waitForEvent('download')
   await page.getByRole('button',{name:'PDF',exact:true}).nth(index).click()
   const download=await downloadPromise
   const path=`/tmp/qr-sign-${slug}-${records[index].id}.pdf`
   await download.saveAs(path)
   assert.ok(download.suggestedFilename().endsWith('-sign.pdf'))
   const params=new URLSearchParams({site_id:records[index].site_id,qr:records[index].public_code})
   manifest.push({path,url:`${base}/kiosk/${slug}?${params}`})
  }
  failTemplate=true
  await page.getByRole('button',{name:'PDF',exact:true}).first().click()
  await page.getByRole('alert').filter({hasText:'Failed to create QR sign'}).waitFor()
  assert.deepEqual(errors,[])
  console.log(`PASS ${width}px: two template downloads, correct filenames, and template failure feedback`)
  await context.close()
 }}finally{fs.writeFileSync('/tmp/qr-sign-manifest.json',JSON.stringify(manifest));await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
