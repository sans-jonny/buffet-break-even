import {formatReceiptTimestamp} from '@/ui/format/time'
import {formatRestaurantTitle} from '@/ui/format/restaurantTitle'

/** 使用小票记录的时间，不能回退到当前导出时间。 */
export function receiptImageFilename(restaurant: string, time: string | Date, typeName?: string): string {
    const name = formatRestaurantTitle(restaurant, typeName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/, '').slice(0, 80) || '餐厅'
    const pad = (value: number) => String(value).padStart(2, '0')
    const timestamp = typeof time === 'string' ? formatReceiptTimestamp(time)
        : `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
    return `${name}_${timestamp.replace(/[<>"/\\|?*\u0000-\u001f]/g, '_')}.png`
}
