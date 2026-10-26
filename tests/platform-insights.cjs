const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function load(file,mocks={},cache=new Map()){
 file=path.resolve(file);if(cache.has(file))return cache.get(file)
 const exports={};cache.set(file,exports)
 new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(exports,name=>mocks[name]||(name.startsWith('@/')||name.startsWith('.')?load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name+'.ts'),mocks,cache):require(name)))
 return exports
}
const dates=load('lib/analytics/platform-range.ts'),stats=load('lib/analytics/platform-insights.ts')
const now=new Date('2026-10-26T12:00:00Z')
const period=dates.platformRange(new URLSearchParams(),now)
function event(overrides={}){return{id:'event',business_id:'a',event_type:'search',search_query:'Coffee',selected_allergens:[],result_count:2,filters_active:false,session_id:'session',source:'qr',access_point_id:'point',site_id:'site',created_at:'2026-10-21T11:00:00Z',...overrides}}
test('last complete week and previous week use Irish calendar dates over DST',()=>{
 assert.deepEqual(period.range,{start:'2026-10-19',end:'2026-10-25',previousStart:'2026-10-12',previousEnd:'2026-10-18',days:7,timezone:'Europe/Dublin',partial:false})
 assert.equal(period.currentStart.toISOString(),'2026-10-18T23:00:00.000Z')
 assert.equal(period.currentEnd.toISOString(),'2026-10-26T00:00:00.000Z')
 assert.equal((period.currentEnd-period.currentStart)/3600000,169)
 const spring=dates.platformRange(new URLSearchParams(),new Date('2026-03-30T12:00Z'))
 assert.equal((spring.currentEnd-spring.currentStart)/3600000,167)
})
test('dates reject invalid, excessive, future and reversed ranges; custom today is partial',()=>{
 for(const query of ['range=nope','range=custom&start=2026-02-30&end=2026-03-01','range=custom&start=2026-10-26&end=2026-10-25','range=custom&start=2026-10-26&end=2026-10-27','range=custom&start=2020-01-01&end=2026-10-25','range=custom&start=2026-10-01','start=2026-10-01'])assert.throws(()=>dates.platformRange(new URLSearchParams(query),now))
 const today=dates.platformRange(new URLSearchParams('range=custom&start=2026-10-26&end=2026-10-26'),now)
 assert.equal(today.currentEnd.toISOString(),now.toISOString());assert.equal(today.range.partial,true)
 assert.equal(dates.platformRange(new URLSearchParams('range=7d'),now).range.start,'2026-10-19')
})
test('combines businesses without merging session identities, excludes demos and normalizes terms',()=>{
 const builder=stats.platformAccumulator(period.range,new Set(['a','b']),false,now.toISOString())
 for(const e of [event(),event({business_id:'b',search_query:'  COFFEE   '}),event({search_query:'coffee',created_at:'2026-10-13T10:00:00Z'}),event({business_id:'demo',search_query:'IGNORE'}),event({business_id:'b',event_type:'page_view'}),event({business_id:null}),event({created_at:'2026-10-01T00:00:00Z'})])builder.add(e)
 const report=builder.result()
 assert.equal(report.overview.searches,2);assert.equal(report.overview.previousSearches,1);assert.equal(report.overview.sessions,2)
 assert.equal(report.topSearches[0].count,2);assert.equal(report.topSearches[0].previousCount,1);assert.equal(report.topSearches[0].businesses,2);assert.equal(report.topSearches[0].changePercent,100)
 assert.equal(report.daily.length,7);assert.equal(report.daily[2].searches,2)
 const json=JSON.stringify(report);assert.ok(!json.includes('session_id'));assert.ok(!json.includes('access_point_id'));assert.ok(!json.includes('IGNORE'))
})
test('uses real filter selections, de-duplicates synonyms, and treats unknown result counts correctly',()=>{
 const builder=stats.platformAccumulator(period.range,new Set(['a']),false,now.toISOString())
 for(const e of [event({search_query:'milk chocolate'}),event({event_type:'filter',selected_allergens:['contains_milk','milk','contains_nuts'],search_query:'dietary:Vegan|dietary:Vegan|dietary:Gluten-Free'}),event({search_query:' missing ',result_count:0,filters_active:true}),event({search_query:'MISSING',result_count:null})])builder.add(e)
 const report=builder.result()
 assert.equal(report.topAllergens.find(x=>x.term==='Milk').count,1)
 assert.equal(report.topDietary.find(x=>x.term==='vegan').count,1)
 assert.equal(report.noResults[0].count,1);assert.equal(report.noResults[0].filtered,1);assert.equal(report.overview.noResultSearches,1)
 assert.equal(report.topSearches.find(x=>x.term==='milk chocolate').changePercent,null)
})
test('summary identifies date and scope, and CSV neutralizes spreadsheet formula terms',()=>{
 const builder=stats.platformAccumulator(period.range,new Set(['a']),true,now.toISOString());builder.add(event({search_query:'=HYPERLINK("x")'}))
 const report=builder.result(),csv=stats.platformCsv(report),summary=stats.platformSummary(report)
 assert.match(summary,/including demos/);assert.match(summary,/2026-10-19 to 2026-10-25/)
 assert.ok(csv.includes("'=hyperlink("));assert.ok(!summary.includes('session_id'))
})
function dbFixture({events=[],businesses=[{id:'a',plan_type:'starter'},{id:'demo',plan_type:'demo'}],eventError=false}={}){
 const calls=[]
 return{calls,db:{from(table){let offset=0,end=0;const filters=[];const q={select(){return q},order(field){calls.push(['order',table,field]);return q},gte(key,value){filters.push([key,value]);return q},lt(key,value){filters.push([key,value]);return q},range(a,b){offset=a;end=b;return q},then(resolve,reject){calls.push([table,offset,end,filters]);return Promise.resolve({data:(table==='businesses'?businesses:events).slice(offset,end+1),error:table==='kiosk_analytics_events'&&eventError?{message:'broken'}:null}).then(resolve,reject)}};return q}}}
}
test('loader pages past 1,000 businesses and events without returning partial reports on errors',async()=>{
 const {loadPlatformInsights}=load('lib/analytics/load-platform-insights.ts')
 const f=dbFixture({businesses:Array.from({length:1001},(_,i)=>({id:String(i),plan_type:i===0?'demo':'starter'})),events:Array.from({length:1001},(_,i)=>event({id:String(i),business_id:i===1000?'1000':'1'}))})
 const report=await loadPlatformInsights(f.db,period,false,now.toISOString())
 assert.equal(report.overview.searches,1001);assert.equal(report.overview.eligibleBusinesses,1000);assert.equal(report.topSearches[0].businesses,2)
 assert.ok(f.calls.some(x=>x[0]==='kiosk_analytics_events'&&x[1]===1000));assert.ok(f.calls.some(x=>x[0]==='businesses'&&x[1]===1000))
 const bad=dbFixture({eventError:true});await assert.rejects(loadPlatformInsights(bad.db,period,false,now.toISOString()),/Could not load/)
})
function apiFixture({token=true,verified=true,authorized=true}={}){
 let loaded=0
 const api=load('app/api/super-admin/insights/route.ts',{
  'next/headers':{cookies:async()=>({get:()=>token?{value:'token'}:undefined})},jose:{jwtVerify:async()=>{if(!verified)throw new Error('invalid');return{payload:{userId:'actor',email:'actor@example.invalid',role:'super_admin'}}}},
  '@/lib/supabase/server':{createServiceClient:()=>({})},'@/lib/auth':{getJwtSecret:()=>new Uint8Array(),hasSuperAdminAccess:async()=>authorized},
  '@/lib/analytics/load-platform-insights':{loadPlatformInsights:async(_db,_range,includeDemo)=>{loaded++;return{includeDemo}}},'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200,headers:options?.headers})}},
 })
 return{send:query=>api.GET({nextUrl:new URL('https://example.invalid/api/super-admin/insights'+(query?'?'+query:''))}),loaded:()=>loaded}
}
test('endpoint rejects missing/invalid sessions and ordinary admins before loading platform data',async()=>{
 for(const [options,status]of [[{token:false},401],[{verified:false},401],[{authorized:false},403]]){
  const f=apiFixture(options),result=await f.send('business_id=anything');assert.equal(result.status,status);assert.equal(f.loaded(),0)
 }
})
test('endpoint validates ranges and demo switch and marks reports private/no-store',async()=>{
 const f=apiFixture();assert.equal((await f.send('range=unknown')).status,400);assert.equal((await f.send('include_demo=yes')).status,400);assert.equal(f.loaded(),0)
 const response=await f.send('include_demo=true');assert.equal(response.status,200);assert.equal(response.body.includeDemo,true);assert.equal(response.headers['Cache-Control'],'private, no-store')
})
