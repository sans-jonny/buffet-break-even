const test=require('node:test')
const assert=require('node:assert/strict')
const {loadModule}=require('../helpers/runtime.cjs')
const {receiptImageBounds}=loadModule('ui/receipt/receiptImageBounds')

test('透明边界按所有非透明像素裁剪，保留锯齿尖端及半透明边缘',()=>{
    const width=20,height=30,data=new Uint8ClampedArray(width*height*4)
    for(const [x,y,alpha] of [[3,10,255],[15,21,255],[8,5,1],[9,25,128]]) data[(y*width+x)*4+3]=alpha
    assert.deepEqual({...receiptImageBounds(data,width,height)},{x:3,y:5,width:13,height:21})
})

test('完全透明的图片提示重试，避免保存空白小票',()=>{
    assert.throws(()=>receiptImageBounds(new Uint8ClampedArray(16),2,2),/小票图片为空/)
})
