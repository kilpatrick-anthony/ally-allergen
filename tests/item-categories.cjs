const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
function load(file, mocks = {}, cache = new Map()) {
 file=path.resolve(file);if(cache.has(file))return cache.get(file)
 const exports={};cache.set(file,exports)
 new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText)(exports,name=>mocks[name]|| (name.startsWith('@/')||name.startsWith('.')?load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name+'.ts'),mocks,cache):require(name)))
 return exports
}
const { categoryFields, categorySections, orderSubcategories } = load('lib/item-category-tree.ts')
test('category fields trim names, preserve omitted fields and clear children on parent change',()=>{
 assert.deepEqual(categoryFields({category:' Drinks ',subcategory:' Milks '}),{category:'Drinks',subcategory:'Milks'})
 assert.deepEqual(categoryFields({}, {category:'Drinks',subcategory:'Milks'}),{category:'Drinks',subcategory:'Milks'})
 assert.deepEqual(categoryFields({category:''}, {category:'Drinks',subcategory:'Milks'}),{category:'',subcategory:''})
 for(const body of [{subcategory:'Milks'},{category:[]},{category:'a'.repeat(101)},{category:'bad\nname'}])assert.throws(()=>categoryFields(body))
})
const rows=[{name:'Vanilla',category:'Drinks',subcategory:'Syrups'},{name:'Oat',category:'Drinks',subcategory:'Milks'},{name:'Coffee',category:'Drinks'},{name:'Latte',category:'Drinks'},{name:'Other'}]
test('direct items precede alphabetic subcategories without disturbing their own sorting',()=>{
 assert.deepEqual(orderSubcategories(rows.slice(0,4)).map(x=>x.name),['Coffee','Latte','Oat','Vanilla'])
 assert.deepEqual(categorySections(rows).map(x=>[x.title,x.items.map(y=>y.name)]),[['Drinks',['Coffee','Latte']],['Drinks / Milks',['Oat']],['Drinks / Syrups',['Vanilla']],['Uncategorized',['Other']]])
})
function fixture({authenticated=true,error=null}={}){
 const calls=[]
 const db={from(table){const query={select(){return query},eq(key,value){calls.push([table,key,value]);return query},single:async()=>({data:{business_id:'trusted-business',role:'staff'}}),then(resolve,reject){return Promise.resolve({data:[{category:'__proto__',subcategory:'Child'},{category:'Drinks',subcategory:'Milks'}],error:null}).then(resolve,reject)}};return query},rpc:async(name,args)=>{calls.push([name,args]);return{data:2,error}}}
 const {categoryRoutes}=load('lib/server/item-categories.ts',{'next/headers':{cookies:async()=>({get:()=>authenticated?{value:'token'}:undefined})},jose:{jwtVerify:async()=>({payload:{userId:'trusted-user',email:'staff@example.invalid'}})},'@/lib/auth':{getJwtSecret:()=>new Uint8Array()},'@/lib/supabase/server':{createServiceClient:()=>db},'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}}})
 return{routes:categoryRoutes('menu-items'),calls}
}
test('category discovery is business scoped and accepts names matching object prototype keys',async()=>{
 const {routes,calls}=fixture();const result=await routes.GET()
 assert.equal(result.status,200);assert.deepEqual(result.body.subcategories.__proto__,['Child'])
 assert.ok(calls.some(x=>x[0]==='menu_items'&&x[1]==='business_id'&&x[2]==='trusted-business'))
})
test('rename uses authenticated identity and business regardless of request body',async()=>{
 const {routes,calls}=fixture();const result=await routes.PATCH({json:async()=>({category:'Drinks',name:' Beverages ',business_id:'foreign',userId:'foreign'})})
 assert.equal(result.status,200);assert.deepEqual(calls.at(-1),['rename_item_category',{p_business_id:'trusted-business',p_user_id:'trusted-user',p_user_email:'staff@example.invalid',p_kind:'menu-items',p_category:'Drinks',p_subcategory:null,p_new_name:'Beverages'}])
})
test('unauthenticated or invalid rename requests do not reach the mutation',async()=>{
 for(const options of [{authenticated:false},{}]){
 const {routes,calls}=fixture(options);const response=await routes.PATCH({json:async()=>({category:'Drinks',name:''})})
 assert.equal(response.status,options.authenticated===false?401:400);assert.ok(!calls.some(x=>x[0]==='rename_item_category'))
 }
})
test('rename collisions return an actionable conflict instead of merging categories',async()=>{
 const {routes}=fixture({error:{code:'23505'}});const result=await routes.PATCH({json:async()=>({category:'Drinks',subcategory:'Milks',name:'Syrups'})})
 assert.equal(result.status,409);assert.equal(result.body.errorCode,'nameExists')
})
test('allergen PDF preserves direct members and subcategory section labels',async()=>{
 const {generateAllergenTablePDF}=load('lib/pdf/allergenTablePDF.ts',{'./pdfBranding':{hexToRgb:()=>[0,56,66],fetchAllyJenLogoDataUrl:async()=>null,drawPageFooters:async()=>{}}})
 const result=await generateAllergenTablePDF({business:{name:'Rio'},items:rows,outputMode:'base64'})
 const {text}=await require('pdf-parse')(Buffer.from(result,'base64'))
 for(const value of ['Drinks / Milks','Drinks / Syrups','Coffee','Latte','Oat','Vanilla'])assert.ok(text.includes(value),value)
 assert.ok(text.indexOf('Coffee')<text.indexOf('Drinks / Milks'))
})
