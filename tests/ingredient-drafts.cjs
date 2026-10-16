const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const complete = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key=>[key,'none']))
function loader(mocks = {}, fetcher = fetch) {
  const cache = new Map()
  function load(name) {
    if (mocks[name]) return mocks[name]
    if (!name.startsWith('@/')) return require(name)
    const file = path.resolve(name.slice(2) + '.ts')
    if (cache.has(file)) return cache.get(file)
    const exports = {}; cache.set(file,exports)
    const source = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    new Function('exports','require','fetch',source)(exports,load,fetcher)
    return exports
  }
  return load
}
function api({ authenticated=true, role='staff', business=id(1), payload={ name:'Draft oats', allergen_warnings:{} }, version=1, existingIngredient=null }={}) {
  const calls = []
  const db = { from(table) {
    const filters = []
    const query = { select(){return query},eq(...args){filters.push(args);return query},maybeSingle:run,single:run }
    async function run() {
      calls.push({table,filters})
      return { data: table==='user_businesses' ? {business_id:business,role} : filters.some(([key,value])=>key==='business_id' && value!==id(1)) ? null : {id:id(20),business_id:id(1),payload,version,ingredient_id:existingIngredient} }
    }
    return query
  },async rpc(name,args) { calls.push({name,args}); return {data:name.startsWith('activate')?id(30):{version:version+1}} } }
  const load = loader({
    '@/lib/auth':{getJwtSecret:()=> 'fixture'}, '@/lib/supabase/server':{createServiceClient:()=>db},
    jose:{jwtVerify:async()=>({payload:{userId:id(3)}})},
    'next/headers':{cookies:async()=>({get:()=>authenticated?{value:'fixture'}:undefined})},
    'next/server':{NextResponse:Response},
  })
  return {load,calls}
}
const context={params:Promise.resolve({id:id(20)})}
const request = (body) => new Request('https://example.invalid/api', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})

test('draft schema preserves unanswered values and strips ownership/foreign IDs',()=>{
  const {ingredientDraftPayload:schema}=loader()('@/lib/ingredient-draft-schema')
  const result=schema.parse({name:' Draft oats ', business_id:id(2),status:'active',supplier_profiles:{v:{supplier_name:'Supplier',supplier_id:id(99),allergen_warnings:{milk:'contains'},certifications:[],assessment_status:'needs_review'}}})
  assert.equal(result.name,'Draft oats'); assert.deepEqual(result.allergen_warnings,{})
  assert.equal(result.business_id,undefined);assert.equal(result.status,undefined)
  assert.equal(result.supplier_profiles.v.supplier_id,undefined)
  assert.deepEqual(result.supplier_profiles.v.allergen_warnings,{milk:'contains'})
  for (const body of [{name:''},{name:'x',allergen_warnings:{milk:'unknown'}},{name:'x',supplier_profiles:{v:null}},{name:'x',suppliers:[12]},{name:'x',preferred_review_months:0}]) assert.equal(schema.safeParse(body).success,false)
})

test('activation rejects missing answers, unreviewed profiles and inconsistent subtypes before RPC',async()=>{
  for(const payload of [
    {name:'x',allergen_warnings:{}},
    {name:'x',suppliers:['Supplier'],allergen_warnings:complete},
    {name:'x',suppliers:['Supplier','Missing supplier'],allergen_warnings:complete,supplier_profiles:{one:{supplier_name:'Supplier',allergen_warnings:complete,certifications:[],assessment_status:'assessed'}}},
    {name:'x',allergen_warnings:{...complete,nuts_levels:{almonds:'contains'}}},
    {name:'x',allergen_warnings:complete,supplier_profiles:{one:{supplier_name:'Supplier',allergen_warnings:complete,certifications:[],assessment_status:'needs_review'}}},
  ]) {
    const s=api({payload})
    const response=await s.load('@/app/api/ingredient-drafts/[id]/activate/route').POST(request({version:1}),context)
    assert.equal(response.status,400);assert.equal((await response.json()).errorCode,'completeIngredient')
    assert.equal(s.calls.some(call=>call.name),false)
  }
})

test('activation derives safety from stored reviewed variants, resolves IDs server-side and uses live business',async()=>{
  const s=api({payload:{name:'Oats',allergen_warnings:complete,suppliers:['Supplier'],certifications:['Vegan'],supplier_profiles:{one:{supplier_name:'Supplier',supplier_id:id(99),brand:'One',allergen_warnings:{...complete,milk:'contains'},certifications:[],assessment_status:'assessed'}}}})
  const response=await s.load('@/app/api/ingredient-drafts/[id]/activate/route').POST(request({version:1,payload:{allergen_warnings:complete},business_id:id(2)}),context)
  assert.equal(response.status,200)
  const rpc=s.calls.find(call=>call.name)
  assert.equal(rpc.args.p_business,id(1));assert.equal(rpc.args.p_actor,id(3))
  assert.equal(rpc.args.p_payload.allergen_warnings.milk,'contains')
  assert.deepEqual(rpc.args.p_payload.certifications,[])
  assert.equal(rpc.args.p_payload.supplier_profiles.one.supplier_id,undefined)
})

test('authentication, current role and business scoping prevent unauthorized activation',async()=>{
  for(const [options,status] of [[{authenticated:false},401],[{role:'viewer'},403],[{business:id(2)},404]]) {
    const s=api(options), response=await s.load('@/app/api/ingredient-drafts/[id]/activate/route').POST(request({version:1}),context)
    assert.equal(response.status,status);assert.equal(s.calls.some(call=>call.name),false)
  }
  const s=api({existingIngredient:id(30)})
  assert.equal((await s.load('@/app/api/ingredient-drafts/[id]/activate/route').POST(request({version:1}),context)).status,200)
  assert.equal(s.calls.some(call=>call.name),false)
})

test('draft save retries reuse identity/version and retry only failed document uploads',async()=>{
  const calls=[],attempts=new Map()
  let version=0
  const load=loader({},async(url,options)=>{
    calls.push({url,...options})
    if(options.method==='PUT') { const body=JSON.parse(options.body);assert.equal(body.version,version);return Response.json({draft:{version:++version}}) }
    if(url.endsWith('/activate')) return Response.json({ingredient:{id:id(30)}})
    const name=options.body.get('file').name,count=(attempts.get(name)||0)+1;attempts.set(name,count)
    if(name==='fail.pdf' && count===1) return Response.json({}, {status:503})
    return Response.json({datasheet:{id:name}})
  })
  const saver=load('@/lib/ingredient-draft-save').createIngredientDraftSaver()
  const sheets=['good.pdf','fail.pdf'].map(name=>({file:new File(['%PDF-'],name)}))
  await assert.rejects(saver.save({name:'Draft'},sheets,[],'Failed'))
  await saver.save({name:'Corrected'},sheets,[],'Failed')
  assert.equal(attempts.get('good.pdf'),1);assert.equal(attempts.get('fail.pdf'),2)
  const uploads=calls.filter(call=>call.method==='POST')
  assert.equal(uploads[1].body.get('upload_id'),uploads[2].body.get('upload_id'))
  assert.equal(new Set(calls.filter(call=>call.method==='PUT').map(call=>call.url)).size,1)
  assert.equal(await saver.activate('Failed'),id(30))
  assert.equal(JSON.parse(calls.at(-1).body).version,2)
})

test('lost activation responses recover the existing ingredient without repeating document operations',async()=>{
  let posts=0
  const load=loader({},async(url,options)=>{
    if(options.method==='PUT') return Response.json({draft:{version:2,ingredient_id:id(30)}})
    posts++;return Response.json({})
  })
  const {createIngredientDraftSaver,ActivatedIngredientDraft}=load('@/lib/ingredient-draft-save')
  await assert.rejects(createIngredientDraftSaver(id(20),1).save({},[{file:new File(['x'],'a.pdf')}],[],'Failed'),error=>error instanceof ActivatedIngredientDraft && error.ingredientId===id(30))
  assert.equal(posts,0)
})

test('every supported language has draft guidance, actions and recoverable errors',()=>{
  const catalog=require('./helpers/translation-catalog.cjs')
  for (const language of ['en','ga','fr','es','de','pt']) for(const key of ['title','edit','help','resume','draftConflict','documentsPending','reloadDocuments']) assert.ok(catalog[language].ingredientDrafts[key],`${language}.${key}`)
})


test('saving drafts permits incomplete answers but accepts only validated data and live ownership',async()=>{
  const s=api()
  const route=s.load('@/app/api/ingredient-drafts/[id]/route')
  const response=await route.PUT(request({version:0,payload:{name:' Unfinished ',business_id:id(2),status:'active',allergen_warnings:{milk:'contains'}}}),context)
  assert.equal(response.status,200)
  const rpc=s.calls.find(call=>call.name)
  assert.equal(rpc.name,'save_regular_ingredient_draft')
  assert.equal(rpc.args.p_business,id(1));assert.equal(rpc.args.p_version,0)
  assert.equal(rpc.args.p_payload.business_id,undefined);assert.equal(rpc.args.p_payload.status,undefined)
  assert.deepEqual(rpc.args.p_payload.allergen_warnings,{milk:'contains'})
  for(const body of [{version:-1,payload:{name:'x'}},{version:0,payload:{name:''}},{version:0,payload:{name:'x',allergen_warnings:{milk:'bad'}}}]) assert.equal((await route.PUT(request(body),context)).status,400)
  assert.equal(s.calls.filter(call=>call.name).length,1)
})
