const test=require('node:test')
const assert=require('node:assert/strict')
const {loadModule}=require('../helpers/runtime.cjs')

test('H5 使用精确位图尺寸独立绘制，多次导出不同长度不会累积缩放或留出大块空白',()=>{
    const {layoutReceiptImage}=loadModule('ui/receipt/ReceiptImage').ReceiptImage
    const {renderReceiptWeb}=loadModule('ui/receipt/renderReceiptWeb')
    const canvases=[]
    const createCanvas=()=>{
        const scales=[],points=[]
        let canvas
        const native={
            scale:(x,y)=>scales.push([x,y]),
            beginPath(){},moveTo:(x,y)=>points.push([x,y]),lineTo:(x,y)=>points.push([x,y]),
            closePath(){},fill(){},setLineDash(){},stroke(){},fillText(){},
            getImageData(){
                const data=new Uint8ClampedArray(canvas.width*canvas.height*4)
                data[3]=255;data[data.length-1]=255
                return {data,width:canvas.width,height:canvas.height}
            }
        }
        canvas={width:300,height:150,getContext:()=>native,toDataURL:()=> 'data:image/png;base64,complete',scales,points}
        canvases.push(canvas)
        return canvas
    }
    for(const count of [1,60,5,200]) {
        const layout=layoutReceiptImage({restaurant:'测试餐厅',receiptId:'TEST',dateTime:'2026-10-24 12:30',price:100,value:120,
            lines:Array.from({length:count},(_,i)=>({name:'菜品'+i,price:20,count:1})),
            result:{verdict:'break-even',difference:20,isBreakEven:true}})
        assert.match(renderReceiptWeb(layout,createCanvas),/^data:image\/png/)
        const canvas=canvases.at(-1)
        assert.equal(canvas.width,layout.pixelWidth)
        assert.equal(canvas.height,layout.pixelHeight)
        assert.deepEqual(canvas.scales,[[layout.scale,layout.scale]])
        // Paper reaches all four bitmap edges, rather than occupying one small corner.
        assert.ok(canvas.points.some(([x])=>Math.abs(x*layout.scale-canvas.width)<1))
        assert.ok(canvas.points.some(([,y])=>Math.abs(y*layout.scale-canvas.height)<1))
    }
    assert.equal(new Set(canvases).size,4)
})

test('裁剪 1200×1444 画布中仅 400×482 的纸张，PNG 不包含其余透明区域',()=>{
    const {layoutReceiptImage}=loadModule('ui/receipt/ReceiptImage').ReceiptImage
    const {renderReceiptWeb}=loadModule('ui/receipt/renderReceiptWeb')
    const layout=layoutReceiptImage({restaurant:'测试',receiptId:'ID',dateTime:'2026-10-24',price:200,value:112,
        lines:[{name:'猪五花肉',price:14,count:8}],result:{verdict:'below',difference:-88,isBreakEven:false}})
    const pixels=new Uint8ClampedArray(layout.pixelWidth*layout.pixelHeight*4)
    for(let y=0;y<482;y++)for(let x=0;x<400;x++)pixels[(y*layout.pixelWidth+x)*4+3]=255
    const canvases=[],draws=[]
    const createCanvas=()=>{
        const native={scale(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},setLineDash(){},stroke(){},fillText(){},
            getImageData:()=>({data:pixels,width:layout.pixelWidth,height:layout.pixelHeight}),
            drawImage:(...args)=>draws.push(args)}
        const canvas={width:0,height:0,getContext:()=>native,toDataURL:()=>`data:image/png;size=${canvas.width}x${canvas.height}`}
        canvases.push(canvas);return canvas
    }
    const image=renderReceiptWeb(layout,createCanvas)
    assert.equal(image,'data:image/png;size=400x482')
    assert.equal(canvases.length,2)
    assert.deepEqual(draws[0].slice(1),[0,0,400,482,0,0,400,482])
})
