import type {ReceiptLineView} from '@/presentation/receipt/ReceiptLineView'
import type {BreakEvenView} from '@/presentation/shared/BreakEvenView'
import {formatRestaurantTitle} from '@/ui/format/restaurantTitle'

export interface ReceiptImageData {
    restaurant: string
    typeName?: string
    participants?: readonly string[]
    receiptId: string
    dateTime: string
    date?: string
    price: number
    value: number
    lines: readonly ReceiptLineView[]
    result: BreakEvenView
}

type Text = {text: string; x: number; y: number; size: number; align: 'left' | 'center' | 'right'; color: string}

/** Layout the complete receipt before allocating a canvas, including wrapped names. */
export function layoutReceiptImage(data: ReceiptImageData) {
    const width = 600, padding = 36
    const texts: Text[] = [], dividers: number[] = []
    let y = 54
    function text(value: string, x: number, size = 22, align: Text['align'] = 'left', color = '#493728') {
        texts.push({text:value, x, y, size, align, color})
    }
    function wrap(value: string, available: number, size: number) {
        const rows: string[] = []
        let row = '', used = 0
        for (const char of value) {
            const advance = /[\u0020-\u007e]/.test(char) ? size * .65 : size
            if (char === '\n' || (row && used + advance > available)) {
                rows.push(row); row = ''; used = 0
            }
            if (char !== '\n') {row += char; used += advance}
        }
        if (row) rows.push(row)
        return rows
    }
    function paragraph(value: string, size = 22, centered = false) {
        for (const row of wrap(value, width - padding * 2, size)) {
            text(row, centered ? width / 2 : padding, size, centered ? 'center' : 'left')
            y += size * 1.5
        }
    }
    function divider() {y += 14; dividers.push(y); y += 30}
    paragraph('PAGER MESSAGE', 30, true)
    y += 12
    paragraph(formatRestaurantTitle(data.restaurant, data.typeName), 24, true)
    divider()
    paragraph('ID: ' + data.receiptId, 20)
    paragraph(data.dateTime, 20)
    divider()
    if (data.participants?.length) {
        paragraph('用餐人：' + data.participants.join('、'))
        y += 12
    }
    const title = {'break-even':'成功回本', close:'就差一点', below:'大慈善家'}[data.result.verdict]
    text(title, width / 2, 40, 'center', '#f04c0e'); y += 60
    paragraph(data.result.isBreakEven
        ? `这顿吃回了 ${Math.round(data.result.difference)} 元，漂亮！`
        : `老板含泪赚了你 ${Math.round(-data.result.difference)} 元，下次多拿点贵的！`, 22, true)
    divider()
    const columns = [padding, width / 2, width - padding]
    const alignments = ['left','center','right'] as const
    ;['就餐价格','已吃价值','差额'].forEach((label,i)=>text(label,columns[i],21,alignments[i]))
    y += 38
    const amounts = [`¥${data.price.toFixed(2)}`,`¥${data.value.toFixed(2)}`,`${data.result.isBreakEven ? '+' : '−'}¥${Math.abs(data.result.difference).toFixed(2)}`]
    amounts.forEach((amount,i)=>text(amount,columns[i],24,alignments[i]))
    y += 18
    divider()
    for (const line of data.lines) {
        const rows = wrap(line.name, 320, 22)
        rows.forEach((row,i)=>{text(row,padding); if (i < rows.length - 1) y += 32})
        text('×' + line.count, 440, 20, 'right')
        text('¥' + (line.price * line.count).toFixed(2), width - padding, 20, 'right')
        y += 42
    }
    divider()
    text('||||||||||||||||||||||||||||||||',width / 2,28,'center'); y += 38
    paragraph('Finished dining',20,true)
    const height = Math.ceil(y + 36)
    // Bound bitmap dimensions for mobile canvas implementations without cutting off any content.
    const scale = Math.min(2, 4096 / height)
    return {width, height, scale, pixelWidth:Math.floor(width * scale), pixelHeight:Math.floor(height * scale), texts, dividers}
}

export type ReceiptDrawingContext = Pick<ReturnType<typeof uni.createCanvasContext>,
    'scale' | 'setFillStyle' | 'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill' |
    'setStrokeStyle' | 'setLineWidth' | 'setLineDash' | 'stroke' | 'setTextBaseline' |
    'setFontSize' | 'setTextAlign' | 'fillText'>

export function drawReceiptImage(context: ReceiptDrawingContext, layout: ReturnType<typeof layoutReceiptImage>) {
    const {width,height,scale,texts,dividers} = layout
    context.scale(scale,scale)
    context.setFillStyle('#fffdf8')
    context.beginPath()
    context.moveTo(0,12)
    for (let x=0;x<width;x+=20) {context.lineTo(x+10,0);context.lineTo(x+20,12)}
    context.lineTo(width,height-12)
    for (let x=width;x>0;x-=20) {context.lineTo(x-10,height);context.lineTo(x-20,height-12)}
    context.closePath(); context.fill()
    context.setStrokeStyle('#d9d0c6')
    context.setLineWidth(1)
    context.setLineDash([6,5],0)
    for (const y of dividers) {context.beginPath();context.moveTo(36,y);context.lineTo(width-36,y);context.stroke()}
    context.setTextBaseline('top')
    for (const item of texts) {
        context.setFillStyle(item.color);context.setFontSize(item.size);context.setTextAlign(item.align)
        context.fillText(item.text,item.x,item.y)
    }
}
