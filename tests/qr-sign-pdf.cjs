const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { PDFDocument } = require('pdf-lib')
const { renderToStaticMarkup } = require('react-dom/server')
const { createElement } = require('react')
const { QRCodeSVG } = require('qrcode.react')
const sharp = require('sharp')
const exportsForFile = {}
new Function('exports','require',ts.transpileModule(fs.readFileSync('lib/pdf/qrSignPDF.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(exportsForFile,require)
const { createQrSignPDF } = exportsForFile

test('QR sign overlays the actual template while preserving its page size, artwork and text',async()=>{
 const template=fs.readFileSync('public/Template - QR.pdf')
 const original=await PDFDocument.load(template)
 const url='https://allyjen.ie/kiosk/rio?site_id=11111111-1111-4111-8111-111111111111&qr=rio-front-door'
 const svg=renderToStaticMarkup(createElement(QRCodeSVG,{value:url,size:1024,marginSize:4,level:'H',fgColor:'#003842'}))
 const png=await sharp(Buffer.from(svg)).png().toBuffer()
 const result=await createQrSignPDF(template,`data:image/png;base64,${png.toString('base64')}`)
 const output=await PDFDocument.load(result)
 assert.equal(output.getPageCount(),original.getPageCount())
 assert.deepEqual(output.getPage(0).getSize(),original.getPage(0).getSize())
 const parsed=await require('pdf-parse')(Buffer.from(result))
 assert.match(parsed.text,/SCAN FOR ALLERGEN INFORMATION/)
 assert.match(parsed.text,/AllyJen/)
 fs.writeFileSync('/tmp/ally-qr-template-example.pdf',result)
 fs.writeFileSync('/tmp/ally-qr-template-example-url.txt',url)
})
