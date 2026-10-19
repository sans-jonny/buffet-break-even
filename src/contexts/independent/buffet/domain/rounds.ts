import type {ProductLine} from '@/contexts/independent/buffet/domain/ProductLine'
import type {SavedLine} from '@/contexts/independent/buffet/domain/SavedLine'
import type {SavedRound} from '@/contexts/independent/buffet/domain/SavedRound'
import {cents, sumMoney} from '@/contexts/independent/buffet/domain/money'

export function getRoundValue(lines: readonly ProductLine[]) {
    return sumMoney(lines.map(line => cents(line.product.price) * line.count / 100))
}

export function getCommittedValue(rounds: readonly SavedRound[]) {
    return sumMoney(rounds.map(round => round.value))
}

export function aggregateLines(rounds: readonly SavedRound[], pending: readonly ProductLine[] = []): SavedLine[] {
    const lines = new Map<string, SavedLine>()
    const add = (line: SavedLine) => {
        const existing = lines.get(line.name)
        if (existing) existing.count += line.count
        else lines.set(line.name, {...line})
    }
    rounds.forEach(round => round.lines.forEach(add))
    pending.forEach(({product, count}) => add({name: product.name, price: product.price, count}))
    return Array.from(lines.values())
}

export function buildRound(lines: readonly ProductLine[], time: string): SavedRound {
    return {
        time,
        value: getRoundValue(lines),
        lines: lines.map(({product, count}) => ({name: product.name, price: product.price, count}))
    }
}
