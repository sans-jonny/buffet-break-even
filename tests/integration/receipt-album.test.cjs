const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule} = require('../helpers/runtime.cjs')

const receipt = () => ({restaurant:'我的餐厅',typeName:'火锅',participants:['团长','朋友'],receiptId:'DINING-1',dateTime:'2026-10-24 12:30',
  price:100,value:120,lines:[{name:'鲜切牛肉',price:30,count:4}],result:{verdict:'break-even',isBreakEven:true,difference:20}})

function setup(extra = {}, readReceipt = receipt) {
  const calls=[],toasts=[]
  const context=Object.fromEntries(['scale','setFillStyle','beginPath','moveTo','lineTo','closePath','fill','setStrokeStyle','setLineWidth','setLineDash','stroke','setTextBaseline','setFontSize','setTextAlign','fillText'].map(name=>[name,(...args)=>calls.push([name,...args])]))
  context.draw=(_,callback)=>callback()
  const platform={
    createCanvasContext:()=>context,
    canvasToTempFilePath:options=>{calls.push(['export',options]);options.success({tempFilePath:'/tmp/receipt.png'})},
    canvasGetImageData:options=>{
      const data=new Uint8ClampedArray(options.width*options.height*4)
      data[3]=255;data[data.length-1]=255
      options.success({data,width:options.width,height:options.height})
    },
    saveImageToPhotosAlbum:options=>{calls.push(['album',options.filePath]);options.success()},
    getSystemInfoSync:()=>({uniPlatform:'mp-weixin'}),
    showToast:options=>toasts.push(options.title),
    ...extra
  }
  const album=loadModule('ui/composables/useReceiptAlbum',platform).useReceiptAlbum(readReceipt,layout=>{
    calls.push(['web-render',layout])
    return 'data:image/png;base64,receipt'
  })
  return {album,calls,toasts}
}

test('图片文件名包含餐厅名及本地年月日时分秒，并处理非法字符', () => {
  const {receiptImageFilename}=loadModule('ui/receipt/receiptImageFilename')
  const time=new Date(2026,9,24,8,9,3)
  assert.equal(receiptImageFilename('牛牛',time),'牛牛_2026-10-24 08:09:03.png')
  assert.equal(receiptImageFilename('牛牛',time,'寿喜烧'),'寿喜烧 · 牛牛_2026-10-24 08:09:03.png')
  assert.equal(receiptImageFilename('牛/牛:*',time),'牛_牛___2026-10-24 08:09:03.png')
  assert.equal(receiptImageFilename('牛牛','2001-02-03 04:05:06'),'牛牛_2001-02-03 04:05:06.png')
  assert.equal(receiptImageFilename('牛牛','2001-02-03 04:05'),'牛牛_2001-02-03 04:05:00.png')
})

test('反复导出使用小票记录的历史时间，绝不使用当前导出时间',async()=>{
  const {album}=setup({},()=>({...receipt(),date:'2001-02-03 04:05:06'}))
  await album.openPreview()
  assert.equal(album.filename.value,'火锅 · 我的餐厅_2001-02-03 04:05:06.png')
  album.previewPath.value=''
  await album.openPreview()
  assert.equal(album.filename.value,'火锅 · 我的餐厅_2001-02-03 04:05:06.png')
})

test('微信相册使用命名后的图片路径，保存后删除工作文件', async () => {
  const operations=[]
  const {album,calls}=setup({env:{USER_DATA_PATH:'/user'},getFileSystemManager:()=>({
    copyFile:options=>{operations.push(['copy',options.srcPath,options.destPath]);options.success()},
    unlink:options=>operations.push(['unlink',options.filePath])
  })})
  await album.openPreview()
  assert.match(album.filename.value,/^火锅 · 我的餐厅_\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.png$/)
  const named='/user/'+album.filename.value
  assert.equal(operations.length,0)
  await album.download()
  assert.deepEqual(operations,[['copy','/tmp/receipt.png',named],['unlink',named]])
  assert.equal(calls.find(call=>call[0]==='album')[1],named)
})

test('文件系统拒绝冒号时兼容保存，不影响精确到秒的时间', async () => {
  const {album,calls}=setup({env:{USER_DATA_PATH:'/user'},getFileSystemManager:()=>({
    copyFile:options=>options.destPath.includes(':') ? options.fail({errMsg:'invalid filename'}) : options.success(),
    unlink:()=>{}
  })})
  await album.openPreview()
  await album.download()
  assert.equal(calls.find(call=>call[0]==='album')[1],'/user/'+album.filename.value.replace(/:/g,'-'))
})

test('小票与点餐明细标题统一种类在前，旧记录缺少种类保留原名',()=>{
  const {formatRestaurantTitle}=loadModule('ui/format/restaurantTitle')
  assert.equal(formatRestaurantTitle('牛牛','寿喜烧'),'寿喜烧 · 牛牛')
  assert.equal(formatRestaurantTitle('旧版餐厅'),'旧版餐厅')
  const layout=loadModule('ui/receipt/ReceiptImage').layoutReceiptImage(receipt())
  assert.ok(layout.texts.some(item=>item.text==='火锅 · 我的餐厅'))
  assert.equal(layout.texts.some(item=>item.text==='我的餐厅 · 火锅'),false)
})

test('完整长小票按内容排版，长餐厅名和多人昵称不截断，位图尺寸有界', () => {
  const data=receipt()
  data.restaurant='很长的餐厅名称'.repeat(10)
  data.participants=Array.from({length:30},(_,i)=>'用餐人'+i)
  data.lines=Array.from({length:200},(_,i)=>({name:'第'+i+'份鲜切牛肉套餐'.repeat(3),price:20,count:2}))
  const layout=loadModule('ui/receipt/ReceiptImage').layoutReceiptImage(data)
  assert.ok(layout.height>8000)
  assert.ok(layout.pixelHeight<=4096)
  assert.ok(layout.pixelWidth<=1200)
  const text=layout.texts.map(item=>item.text).join('')
  assert.ok(text.includes(data.restaurant))
  assert.ok(text.includes('用餐人29'))
  assert.ok(text.includes(data.lines.at(-1).name))
  assert.ok(text.includes('2026-10-24 12:30'))
  assert.ok(text.includes('¥120.00'))
  assert.ok(layout.texts.every(item=>item.y<layout.height-12))
})

test('长按只生成预览，点击预览才保存相册，重复点击只保存一次', async () => {
  const {album,calls,toasts}=setup()
  const first=album.openPreview()
  const second=album.openPreview()
  assert.equal(album.busy.value,true)
  await Promise.all([first,second])
  assert.equal(calls.filter(call=>call[0]==='album').length,0)
  assert.equal(album.previewPath.value,'/tmp/receipt.png')
  assert.equal(toasts.length,0)
  await Promise.all([album.download(),album.download()])
  assert.equal(calls.filter(call=>call[0]==='album').length,1)
  assert.ok(calls.some(call=>call[0]==='fillText'&&call[1]==='鲜切牛肉'))
  assert.ok(calls.some(call=>call[0]==='fillText'&&call[1].includes('团长、朋友')))
  assert.ok(toasts.includes('已保存到相册'))
  assert.equal(album.busy.value,false)
})

test('H5 提供生成后的图片预览，不调用系统相册接口', async () => {
  const {album,calls}=setup({getSystemInfoSync:()=>({uniPlatform:'web'})})
  await album.openPreview()
  assert.equal(album.previewPath.value,'data:image/png;base64,receipt')
  assert.equal(calls.filter(call=>call[0]==='album').length,0)
  assert.equal(calls.filter(call=>call[0]==='export').length,0)
  assert.equal(calls.filter(call=>call[0]==='web-render').length,1)
})

test('首次生成及小票长度变化时，用最终尺寸重新挂载画布后才绘制', async () => {
  let data=receipt(), generation=0
  const sizes=[]
  const {album}=setup({createCanvasContext:()=>{
    assert.ok(album.canvasVersion.value>generation)
    generation=album.canvasVersion.value
    sizes.push({...album.canvasSize.value})
    const context=Object.fromEntries(['scale','setFillStyle','beginPath','moveTo','lineTo','closePath','fill','setStrokeStyle','setLineWidth','setLineDash','stroke','setTextBaseline','setFontSize','setTextAlign','fillText'].map(name=>[name,()=>{}]))
    context.draw=(_,done)=>done()
    return context
  }},()=>data)
  assert.equal(album.canvasVersion.value,0)
  await album.openPreview()
  data={...data,lines:Array.from({length:40},(_,i)=>({name:'菜品'+i,price:10,count:1}))}
  await album.openPreview()
  assert.equal(generation,2)
  assert.ok(sizes[1].height>sizes[0].height)
})

test('权限拒绝先确认，设置授权后重试同一张图片，不重复生成', async () => {
  let attempts=0,settings=0
  const {album,calls,toasts}=setup({
    saveImageToPhotosAlbum:options=>{if(++attempts===1) options.fail({errMsg:'saveImageToPhotosAlbum:fail auth deny'});else options.success()},
    openSetting:options=>{settings++;options.success({authSetting:{'scope.writePhotosAlbum':true}})}
  })
  await album.openPreview()
  assert.equal(settings,0)
  assert.equal(attempts,0)
  await album.download()
  assert.equal(album.permissionDialog.dialog.value.title,'允许保存到相册')
  album.permissionDialog.confirm()
  for(let i=0;i<6;i++) await Promise.resolve()
  assert.equal(attempts,2)
  assert.equal(settings,1)
  assert.equal(calls.filter(call=>call[0]==='export').length,1)
  assert.ok(toasts.includes('已保存到相册'))
})

test('生成失败后释放忙碌状态，允许重试', async () => {
  let attempts=0
  const {album,toasts}=setup({canvasToTempFilePath:options=>{
    if(++attempts===1) options.fail({errMsg:'canvas error'});else options.success({tempFilePath:'/tmp/retry.png'})
  }})
  await album.openPreview()
  assert.equal(album.busy.value,false)
  assert.ok(toasts.includes('生成小票图片失败，请重试'))
  await album.openPreview()
  assert.equal(album.previewPath.value,'/tmp/retry.png')
  await album.download()
  assert.ok(toasts.includes('已保存到相册'))
})

test('相册导出裁掉大块透明区域，只导出实际小票范围',async()=>{
  const {album,calls}=setup({canvasGetImageData:options=>{
    const data=new Uint8ClampedArray(options.width*options.height*4)
    for(let y=0;y<482;y++)for(let x=0;x<400;x++)data[(y*options.width+x)*4+3]=255
    options.success({data,width:options.width,height:options.height})
  }})
  await album.openPreview()
  const options=calls.find(call=>call[0]==='export')[1]
  assert.equal(options.x,0);assert.equal(options.y,0)
  assert.equal(options.width,400);assert.equal(options.height,482)
  assert.equal(options.destWidth,400);assert.equal(options.destHeight,482)
})
