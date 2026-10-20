import type {ReceiptViewModel} from './ReceiptViewModel'
import {calculateBreakEven} from '@/utils/break-even'

export function toReceiptView(receipt: {
    id: string; restaurant: string; date: string; price: number; value: number;
    lines: readonly { name: string; count: number; price: number }[];
    rounds: readonly { time: string; value: number; lines: readonly { name: string; count: number; price: number }[] }[]
}): ReceiptViewModel {
    return {
        id: receipt.id,
        restaurant: receipt.restaurant,
        date: receipt.date,
        price: receipt.price,
        value: receipt.value,
        lines: receipt.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
        rounds: receipt.rounds.map(round => ({
            time: round.time, value: round.value,
            lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
        })),
        dishCount: receipt.lines.reduce((count, line) => count + line.count, 0),
        result: calculateBreakEven(receipt.value, receipt.price)
    }
}
