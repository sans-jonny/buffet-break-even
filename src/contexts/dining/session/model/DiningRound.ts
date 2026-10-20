import type {ProductLine} from './snapshot/ProductLine'
import type {SavedLine} from './snapshot/SavedLine'
import type {SavedRound} from './snapshot/SavedRound'
import {cents, sumMoney} from '@/utils/money'

/** 轮次值对象；时间、金额和明细描述其值，时间不作为独立业务标识。 */
export class DiningRound {
    private readonly details: SavedLine[]

    private constructor(public readonly time: string, public readonly value: number, lines: readonly SavedLine[]) {
        this.details = lines.map(line => ({name: line.name, count: line.count, price: line.price}))
    }

    static create(lines: readonly ProductLine[], time: string): DiningRound {
        return new DiningRound(time, DiningRound.valueOf(lines),
            lines.map(({product, count}) => ({name: product.name, price: product.price, count})))
    }

    static restore(round: SavedRound): DiningRound {
        return new DiningRound(round.time, round.value, round.lines)
    }

    static valueOf(lines: readonly ProductLine[]): number {
        return sumMoney(lines.map(line => cents(line.product.price) * line.count / 100))
    }

    toSnapshot(): SavedRound {
        return {time: this.time, value: this.value, lines: this.details.map(line => ({...line}))}
    }
}
