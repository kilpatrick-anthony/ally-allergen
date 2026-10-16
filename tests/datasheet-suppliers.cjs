const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const catalog = require('./helpers/translation-catalog.cjs')
function loader(mocks={}) {
  const cache = new Map()
  function load(name) {
    if (mocks[name]) return mocks[name]
    if (!name.startsWith('@/')) return require(name)
    const base=path.resolve(name.slice(2)),file=fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts'
    if (cache.has(file)) return cache.get(file)
    const exports={};cache.set(file,exports)
    new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(exports,load)
    return exports
  }
  return load
}
function database({ fail }={}) {
  const calls=[],writes=[]
  const tables={
    user_businesses:[{user_id:'actor',business_id:'business'}],
    ingredients:[{id:'single',business_id:'business',suppliers:['Acme']},{id:'multi',business_id:'business',suppliers:['Acme','Other']},{id:'foreign',business_id:'other-business',suppliers:['Secret supplier']}],
    menu_items:[{id:'packaged',business_id:'business',item_type:'packaged',supplier_id:'supplier'},{id:'prepared',business_id:'business',item_type:'prepared',supplier_id:'supplier'},{id:'foreign-supplier',business_id:'business',item_type:'packaged',supplier_id:'secret'}],
    suppliers:[{id:'supplier',business_id:'business',name:'Product supplier'},{id:'secret',business_id:'other-business',name:'Secret supplier'}],
    datasheets:[],
  }
  const db={from(table) {
    const filters=[];let inserted
    const query={ select(){return query},eq(key,value){filters.push(row=>row[key]===value);return query},in(key,values){filters.push(row=>values.includes(row[key]));return query},order(){return query},limit(){return query},insert(row){inserted=row;return query},single:()=>run(true),maybeSingle:()=>run(true),then(resolve,reject){return run(false).then(resolve,reject)} }
    async function run(single) {
      calls.push({table})
      if(table===fail)return {error:{message:'Lookup failed'}}
      if(inserted){writes.push({table,row:inserted});return {data:{id:'new-sheet',...inserted}}}
      const rows=tables[table].filter(row=>filters.every(filter=>filter(row)))
      return {data:single?rows[0]||null:rows,error:null}
    }
    return query
  },storage:{from(){return {upload:async()=>({data:{}}),getPublicUrl:()=>({data:{publicUrl:'https://example.invalid/evidence.pdf'}}),remove:async()=>({})}}}}
  return {db,calls,writes,tables}
}
const service=loader()('@/lib/server/datasheet-suppliers')
test('display fallback preserves document metadata and resolves only unambiguous business-owned sources',async()=>{
  const {db,calls}=database()
  const sheets=[
    {supplier_name:' Historical supplier ',ingredient_id:'single'},
    {supplier_name:' ',ingredient_id:'single'},
    {ingredient_id:'multi'}, {ingredient_id:'foreign'}, {menu_item_id:'packaged'},
    {menu_item_id:'prepared'}, {menu_item_id:'foreign-supplier'}, {},
  ]
  const result=await service.withDatasheetSuppliers(db,'business',sheets)
  assert.deepEqual(result.map(row=>row.display_supplier_name),['Historical supplier','Acme',null,null,'Product supplier',null,null,null])
  assert.deepEqual(result.map(({display_supplier_name,...row})=>row),sheets,'inferred names never overwrite historical metadata')
  assert.equal(calls.filter(call=>call.table==='ingredients').length,1)
  assert.equal(calls.filter(call=>call.table==='menu_items').length,1)
  assert.equal(calls.filter(call=>call.table==='suppliers').length,1)
})
test('known suppliers and empty lists need no source lookups; failed lookups do not appear as missing data',async()=>{
  const {db,calls}=database()
  await service.withDatasheetSuppliers(db,'business',[])
  await service.withDatasheetSuppliers(db,'business',[{supplier_name:'Known'}])
  assert.equal(calls.length,0)
  await assert.rejects(service.withDatasheetSuppliers(database({fail:'ingredients'}).db,'business',[{ingredient_id:'single'}]),error => error.message === 'Lookup failed')
})
test('sole supplier matching ignores blanks and duplicate casing but never chooses between suppliers',()=>{
  const {soleIngredientSupplier}=loader()('@/lib/datasheet-supplier')
  for(const value of [undefined,'Acme',[],[' '],['Acme','Other']]) assert.equal(soleIngredientSupplier(value),null)
  assert.equal(soleIngredientSupplier([' Acme ','acme',null,'']).toLowerCase(),'acme')
})
for(const entity of ['ingredient','menu_item']) test(`${entity}: uploads retain explicit suppliers or persist an unambiguous default`,async()=>{
  for(const supplied of [undefined,'Explicit supplier']) {
    const s=database()
    const load=loader({
      '@/lib/auth':{getJwtSecret:()=> 'fixture'},'@/lib/supabase/server':{createServiceClient:()=>s.db},
      jose:{jwtVerify:async()=>({payload:{userId:'actor'}})},
      'next/headers':{cookies:async()=>({get:()=>({value:'fixture'})})},'next/server':{NextResponse:Response},
    })
    const form=new FormData();form.append('file',new File(['%PDF-1.7'],'spec.pdf',{type:'application/pdf'}));form.append(entity+'_id',entity==='ingredient'?'single':'packaged')
    if(supplied)form.append('supplier_name',supplied)
    const response=await load('@/app/api/upload/datasheet/route').POST({formData:async()=>form})
    assert.equal(response.status,200)
    assert.equal(s.writes[0].row.supplier_name,supplied||(entity==='ingredient'?'Acme':'Product supplier'))
  }
})
test('uploads for multi-supplier ingredients do not fabricate an association',async()=>{
  const s=database(),load=loader({
    '@/lib/auth':{getJwtSecret:()=> 'fixture'},'@/lib/supabase/server':{createServiceClient:()=>s.db},
    jose:{jwtVerify:async()=>({payload:{userId:'actor'}})},'next/headers':{cookies:async()=>({get:()=>({value:'fixture'})})},'next/server':{NextResponse:Response},
  })
  const form=new FormData();form.append('file',new File(['%PDF-1.7'],'spec.pdf'));form.append('ingredient_id','multi')
  assert.equal((await load('@/app/api/upload/datasheet/route').POST({formData:async()=>form})).status,200)
  assert.equal(s.writes[0].row.supplier_name,undefined)
})
test('metadata renders recorded, inferred and unknown suppliers, ingredient origin and version in every language',()=>{
  for(const language of Object.keys(catalog)) {
    const t=(key,replacements={})=>Object.entries(replacements).reduce((text,[key,value])=>text.replaceAll('{'+key+'}',value),key.split('.').reduce((value,key)=>value?.[key],catalog[language])||key)
    const Component=loader({'@/lib/hooks/useTranslation':{useTranslation:()=>({t})}})('@/components/admin/DatasheetFileMetadata').DatasheetFileMetadata
    for(const [sheet,text] of [[{supplier_name:'Historic',display_supplier_name:'Current'},'Historic'],[{display_supplier_name:'Current'},'Current'],[{},catalog[language].ingredientsPortal.supplierNotRecorded]]) {
      const html=renderToStaticMarkup(React.createElement(Component,{sheet:{file_size:1048576,version:'2',...sheet},ingredientName:'Ingredient source'}))
      assert.ok(text && html.includes(text));assert.ok(html.includes('Ingredient source'));assert.ok(html.includes('1.00'));assert.ok(html.includes('data-no-translate'))
    }
  }
})


test('datasheet reads enrich the existing business-scoped results without modifying saved metadata',async()=>{
  const s=database()
  s.tables.datasheets.push(
    {id:'own',business_id:'business',status:'active',ingredient_id:'single',supplier_name:null},
    {id:'menu',business_id:'business',status:'active',menu_item_id:'packaged',supplier_name:null},
    {id:'foreign',business_id:'other-business',status:'active',ingredient_id:'foreign'},
  )
  const load=loader({
    '@/lib/auth':{getJwtSecret:()=> 'fixture'},'@/lib/supabase/server':{createServiceClient:()=>s.db},
    jose:{jwtVerify:async()=>({payload:{userId:'actor'}})},'next/headers':{cookies:async()=>({get:()=>({value:'fixture'})})},'next/server':{NextResponse:Response},
  })
  const response=await load('@/app/api/datasheets/route').GET(new Request('https://example.invalid/api/datasheets'))
  assert.equal(response.status,200)
  const {datasheets}=await response.json()
  assert.deepEqual(datasheets.map(row=>[row.id,row.supplier_name,row.display_supplier_name]),[['own',null,'Acme'],['menu',null,'Product supplier']])
  assert.equal(s.writes.length,0)
})
