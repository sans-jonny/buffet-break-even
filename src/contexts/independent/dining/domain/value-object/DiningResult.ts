import type {DiningResultSnapshot} from '../snapshot/DiningResultSnapshot'
import type {DiningSession} from '../DiningSession'
import type {ProductLine} from '../snapshot/ProductLine'
import type {SavedLine} from '../snapshot/SavedLine'
import type {SavedRound} from '../snapshot/SavedRound'
import {DiningRound} from './DiningRound'
import {sumMoney} from '@/utils/money'

/** 用餐结果值对象；id 引用来源会话，结果自身没有独立的身份与生命周期。 */
export class DiningResult {
    private readonly details: SavedLine[]
    private readonly history: SavedRound[]

    private constructor(public readonly id: string, public readonly restaurant: string, public readonly date: string,
                        public readonly price: number, public readonly value: number, lines: SavedLine[], rounds: SavedRound[]) {
        this.details = lines.map(line => ({...line}))
        this.history = rounds.map(round => DiningRound.restore(round).toSnapshot())
    }

    static from(session: DiningSession, date: string, pending: readonly ProductLine[] = []): DiningResult {
        const rounds = session.rounds
        const lines = new Map<string, SavedLine>()
        const add = (line: SavedLine) => {
            const existing = lines.get(line.name)
            if (existing) existing.count += line.count
            else lines.set(line.name, {...line})
        }
        rounds.forEach(round => round.lines.forEach(add))
        pending.forEach(({product, count}) => add({name: product.name, price: product.price, count}))
        return new DiningResult(session.id, session.restaurant, date, session.ticketPrice,
            sumMoney([session.committedValue, DiningRound.valueOf(pending)]), [...lines.values()], rounds)
    }

    toSnapshot(): DiningResultSnapshot {
        return {
            id: this.id,
            restaurant: this.restaurant,
            date: this.date,
            price: this.price,
            value: this.value,
            lines: this.lines,
            rounds: this.rounds
        }
    }

    get lines(): SavedLine[] {
        return this.details.map(line => ({...line}))
    }

    get rounds(): SavedRound[] {
        return this.history.map(round => DiningRound.restore(round).toSnapshot())
    }
}
