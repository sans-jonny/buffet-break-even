import type {RoundClock} from '../../application/port/out/RoundClock'
import type {ReceiptClock} from '../../application/port/out/ReceiptClock'
import {currentTime, shortDate} from '@/utils/format'

export class SystemDiningClock implements RoundClock, ReceiptClock {
    roundTime() {
        return currentTime(true)
    }

    receiptDate() {
        return `${shortDate()} ${currentTime()}`
    }
}
