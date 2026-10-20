import type {DiningIdGenerator} from '../../application/port/out/DiningIdGenerator'
import type {RoundClock} from '../../application/port/out/RoundClock'
import type {ReceiptClock} from '../../application/port/out/ReceiptClock'
import {currentTime, shortDate} from '@/utils/format'

export class SystemDiningClock implements DiningIdGenerator, RoundClock, ReceiptClock {
    private sequence = 0

    createId() {
        return `meal-${Date.now()}-${++this.sequence}-${Math.random().toString(36).slice(2, 10)}`
    }

    roundTime() {
        return currentTime(true)
    }

    receiptDate() {
        return `${shortDate()} ${currentTime()}`
    }
}
