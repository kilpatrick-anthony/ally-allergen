const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const cache = new Map()
function load(file) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file)
  const exports = {}; cache.set(file, exports)
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(exports, name => name.startsWith('@/') ? load(name.slice(2)+'.ts') : require(name))
  return exports
}
const { orderedNavigationItems: order, adjacentItems } = load('lib/item-navigation.ts')
const rows = [
 {id:'z',name:'Zebra',category:'A',created_at:'2026-10-21',status:'active',is_active:true,item_type:'prepared',certifications:['Vegan'],allergen_warnings:{milk:'contains'}},
 {id:'b',name:'Beta',category:'B',created_at:'2026-10-20',status:'active',is_active:true,item_type:'packaged_product',site_id:'site',certifications:['Vegan'],allergen_warnings:{milk:'may_contain'}},
 {id:'a',name:'Alpha',category:'A',created_at:'2026-10-22',status:'active',is_active:true,item_type:'prepared',description:'Coffee',allergen_warnings:{milk:'none'}},
 {id:'x',name:'Aardvark',created_at:null,status:'review',is_active:false,item_type:'packaged_product',allergen_warnings:{milk:'contains'}},
]
const ids = values => values.map(value=>value.id)
for (const collection of ['ingredients','menu-builder']) {
 test(`${collection}: navigation follows category groups and name order in both directions`,()=>{
  assert.deepEqual(ids(order(collection,rows,'')),['a','z','b','x'])
  assert.deepEqual(ids(order(collection,rows,'?direction=desc')),['z','a','b','x'])
 })
 test(`${collection}: date order crosses categories and keeps undated items last`,()=>{
  assert.deepEqual(ids(order(collection,rows,'?sort=date&direction=desc')),['a','z','b','x'])
  assert.deepEqual(ids(order(collection,rows,'?sort=date')),['b','z','a','x'])
 })
 test(`${collection}: category and search filters restrict adjacent items`,()=>{
  assert.deepEqual(ids(order(collection,rows,'?category=A&q=alp')),['a'])
  assert.deepEqual(ids(order(collection,rows,'?category=uncategorized')),['x'])
 })
}
test('ingredient navigation honours certification, allergen and legacy numbered filters',()=>{
 for(const allergen of ['milk','7. Milk'])assert.deepEqual(ids(order('ingredients',rows,'?allergen='+encodeURIComponent(allergen)+'&certification=Vegan')),['z','b'])
 assert.deepEqual(ids(order('ingredients',rows,'?status=inactive')),['x'])
 assert.deepEqual(ids(order('ingredients',rows,'?q=Coffee')),[])
})
test('menu navigation honours description search, location, type and status',()=>{
 assert.deepEqual(ids(order('menu-builder',rows,'?q=Coffee')),['a'])
 assert.deepEqual(ids(order('menu-builder',rows,'?scope=site&type=packaged_product&status=active')),['b'])
 assert.deepEqual(ids(order('menu-builder',rows,'?scope=global&type=prepared')),['a','z'])
 assert.deepEqual(ids(order('menu-builder',rows,'?status=invalid&type=invalid')),['a','z','b','x'])
})
test('adjacent links stop at both ends and cannot jump from an item outside the list',()=>{
 const ordered=order('ingredients',rows,'')
 assert.deepEqual(adjacentItems(ordered,'a'),{previous:null,next:rows[0],position:1,total:4})
 assert.equal(adjacentItems(ordered,'x').next,null)
 assert.equal(adjacentItems(ordered,'z').previous.id,'a')
 assert.deepEqual(adjacentItems(ordered,'missing'),{previous:null,next:null,position:0,total:4})
 assert.deepEqual(adjacentItems([],'missing'),{previous:null,next:null,position:0,total:0})
})
test('navigation messages exist in all supported languages',()=>{
 const catalog=require('./helpers/translation-catalog.cjs')
 for(const language of ['en','ga','pt','fr','es','de'])assert.deepEqual(Object.keys(catalog[language].itemNavigation),Object.keys(catalog.en.itemNavigation))
})

for (const collection of ['ingredients','menu-builder']) test(`${collection}: navigation keeps direct category items before subcategory groups`,()=>{
 const nested=[{id:'s',name:'A syrup',category:'Drinks',subcategory:'Syrups'},{id:'m',name:'A milk',category:'Drinks',subcategory:'Milks'},{id:'c',name:'Coffee',category:'Drinks'}]
 assert.deepEqual(ids(order(collection,nested,'')),['c','m','s'])
 assert.deepEqual(ids(order(collection,nested,'?direction=desc')),['c','m','s'])
})
