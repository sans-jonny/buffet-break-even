import {ReceiptImage} from './ReceiptImage'
import {receiptImageBounds} from './receiptImageBounds'

/** Use a private bitmap in H5: its dimensions never depend on DOM layout or ResizeSensor. */
export function renderReceiptWeb(layout: ReturnType<typeof ReceiptImage.layoutReceiptImage>, createCanvas = () => document.createElement('canvas')): string {
    const canvas = createCanvas()
    canvas.width = layout.pixelWidth
    canvas.height = layout.pixelHeight
    const native = canvas.getContext('2d', {willReadFrequently:true})
    if (!native) throw Error('无法生成小票图片，请重试')
    const context: ReceiptImage.ReceiptDrawingContext = {
        scale:(x,y)=>native.scale(x,y),
        setFillStyle:color=>{native.fillStyle=color as string},
        beginPath:()=>native.beginPath(),
        moveTo:(x,y)=>native.moveTo(x,y),
        lineTo:(x,y)=>native.lineTo(x,y),
        closePath:()=>native.closePath(),
        fill:()=>native.fill(),
        setStrokeStyle:color=>{native.strokeStyle=color as string},
        setLineWidth:width=>{native.lineWidth=width},
        setLineDash:(pattern,offset)=>{native.setLineDash(pattern);native.lineDashOffset=offset},
        stroke:()=>native.stroke(),
        setTextBaseline:baseline=>{native.textBaseline=baseline === 'normal' ? 'alphabetic' : baseline},
        setFontSize:size=>{native.font=`${size}px sans-serif`},
        setTextAlign:align=>{native.textAlign=align},
        fillText:(text,x,y)=>native.fillText(text,x,y)
    }
    ReceiptImage.drawReceiptImage(context,layout)
    const pixels = native.getImageData(0,0,canvas.width,canvas.height)
    const bounds = receiptImageBounds(pixels.data,pixels.width,pixels.height)
    if (bounds.x || bounds.y || bounds.width !== canvas.width || bounds.height !== canvas.height) {
        const cropped = createCanvas()
        cropped.width = bounds.width
        cropped.height = bounds.height
        const target = cropped.getContext('2d')
        if (!target) throw Error('无法生成小票图片，请重试')
        target.drawImage(canvas,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height)
        return cropped.toDataURL('image/png')
    }
    return canvas.toDataURL('image/png')
}
