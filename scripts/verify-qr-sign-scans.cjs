// Render each manifest PDF to `${path}.png` first, then decode its printed QR.
const fs=require('node:fs'),assert=require('node:assert/strict'),sharp=require('sharp')
const {RGBLuminanceSource,HybridBinarizer,BinaryBitmap,QRCodeReader}=require('@zxing/library')
;(async()=>{
 for(const {path,url} of JSON.parse(fs.readFileSync(process.argv[2]||'/tmp/qr-sign-manifest.json','utf8'))){
  const image=sharp(`${path}.png`)
  const {width,height}=await image.metadata()
  // Frame the printed QR as a phone camera would; exclude the surrounding artwork.
  const xScale=width/595.5,yScale=height/842.25
  const {data,info}=await image.extract({left:Math.round(142.75*xScale),top:Math.round(236.275*yScale),width:Math.round(310*xScale),height:Math.round(310*yScale)}).removeAlpha().greyscale().raw().toBuffer({resolveWithObject:true})
  const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(new Uint8ClampedArray(data),info.width,info.height)))
  const result=new QRCodeReader().decode(bitmap).getText()
  assert.equal(result,url)
  console.log(`PASS ${path}: printed QR decodes to the correct business, site and tracking code`)
 }
})().catch(error=>{console.error(error);process.exitCode=1})
