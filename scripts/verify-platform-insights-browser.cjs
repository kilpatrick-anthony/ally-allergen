// Isolated API fixtures against a local production build. No real business data is changed.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
const base=process.env.BASE_URL||'http://localhost:3111'
const cache=new Map()
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(exports,name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(name));return exports}
const {platformRange}=load('lib/analytics/platform-range.ts'),{platformAccumulator}=load('lib/analytics/platform-insights.ts')
function makeReport(params){const range=platformRange(params,new Date('2026-10-26T12:00:00Z'));const demo=params.get('include_demo')==='true';const aggregate=platformAccumulator(range.range,new Set(demo?['a','b','demo']:['a','b']),demo,'2026-10-26T12:00:00Z');for(const event of [
 {business_id:'a',event_type:'search',search_query:'Coffee'},{business_id:'b',event_type:'search',search_query:' coffee '},{business_id:'a',event_type:'search',search_query:'Oat milk',result_count:0,filters_active:true},{business_id:'demo',event_type:'search',search_query:'Demo item'},
 {business_id:'a',event_type:'filter',selected_allergens:['contains_milk'],search_query:'dietary:Vegan'}, {business_id:'a',event_type:'page_view'},
])aggregate.add({id:'id',site_id:'site',access_point_id:'point',source:'qr',session_id:'session',result_count:2,filters_active:false,selected_allergens:[],created_at:'2026-10-21T11:00:00Z',...event});return aggregate.result()}
;(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:950},timezoneId:'Pacific/Auckland',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']})
 await context.addCookies([{name:'allyjen_cookie_consent',value:encodeURIComponent(JSON.stringify({version:1,necessary:true,analytics:false,updatedAt:new Date().toISOString()})),url:base}])
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message))
 let fail=true,empty=false,slow=false
 await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/api/super-admin/insights'){
  if(slow&&url.searchParams.get('range')==='30d')await new Promise(resolve=>setTimeout(resolve,500))
  if(fail)return route.fulfill({status:503,json:{error:'Temporary report failure'}})
  try{const report=makeReport(url.searchParams);if(empty){const p=platformRange(url.searchParams,new Date('2026-10-26T12:00:00Z'));return route.fulfill({json:platformAccumulator(p.range,new Set(),false,'2026-10-26T12:00:00Z').result()})}return route.fulfill({json:report})}catch(error){return route.fulfill({status:400,json:{error:error.message}})}
 }if(url.pathname==='/api/auth/session')return route.fulfill({json:{authenticated:true,user:{id:'super',name:'Platform admin',role:'super_admin'}}});return route.fulfill({json:{}})})
 await page.goto(base+'/super-admin/insights');await page.getByRole('alert').getByText('Temporary report failure').waitFor()
 fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click()
 await page.getByRole('heading',{name:'Most searched terms',exact:true}).waitFor()
 const table=page.getByRole('table',{name:'Most searched terms',exact:true})
 await table.getByRole('rowheader',{name:'1. coffee',exact:true}).waitFor()
 assert.equal(await table.getByText('demo item',{exact:false}).count(),0)
 assert.match(await page.getByRole('list',{name:'Daily search counts',exact:true}).getByRole('listitem').first().innerText(),/19 Oct/)
 assert.equal(await page.getByRole('navigation',{name:'Super admin navigation'}).getByRole('link',{name:'Search insights'}).getAttribute('aria-current'),'page')
 await page.getByRole('button',{name:'Copy summary',exact:true}).click();await page.getByRole('status').getByText('Weekly summary copied. You can edit it before posting.').waitFor()
 const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/1\. coffee — 2 searches/);assert.match(copied,/2026-10-19 to 2026-10-25/);assert.ok(!copied.includes('business_id'))
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();const download=await downloadPromise;const file=`/tmp/platform-insights-${width}.csv`;await download.saveAs(file);assert.match(fs.readFileSync(file,'utf8'),/Searches.*coffee/);assert.match(download.suggestedFilename(),/2026-10-19-2026-10-25/)
 await page.getByRole('checkbox',{name:'Include demo businesses',exact:true}).check();await table.getByRole('rowheader',{name:'demo item',exact:false}).waitFor()
 await page.getByRole('checkbox',{name:'Include demo businesses',exact:true}).uncheck();await table.getByRole('rowheader',{name:'1. coffee',exact:true}).waitFor()
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits viewport with internally scrollable tables')
 await page.screenshot({path:`/tmp/platform-insights-${width}.png`})
 // An older slow request must not overwrite the selected period.
 slow=true;await page.getByLabel('Reporting period',{exact:true}).selectOption('30d');await page.getByLabel('Reporting period',{exact:true}).selectOption('last_week');await table.getByRole('rowheader',{name:'1. coffee',exact:true}).waitFor();await page.waitForTimeout(700);assert.match(await page.locator('main').innerText(),/19 Oct 2026/)
 await page.getByLabel('Reporting period',{exact:true}).selectOption('custom');await page.getByLabel('From',{exact:true}).fill('2026-10-25');await page.getByLabel('To',{exact:true}).fill('2026-10-24');await page.getByRole('alert').waitFor()
 await page.getByLabel('To',{exact:true}).fill('2026-10-25');await page.getByRole('heading',{name:'Most searched terms',exact:true}).waitFor();await page.getByText('No recorded searches in this period.',{exact:true}).waitFor()
 empty=true;await page.getByLabel('Reporting period',{exact:true}).selectOption('last_week');await page.getByText('No recorded searches in this period.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Copy summary',exact:true}).isDisabled(),true)
 assert.deepEqual(errors,[]);console.log(`PASS ${width}px: navigation, rankings, demos, copy/CSV, date validation, request races, retry and empty state`);await context.close()
}}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1})
