import type {Dining} from '../../coordination/application/dto/Dining';

export namespace ReceiptView {
    export function fromResult(result: Dining.Result) {
        const lines = result.lines.map(line => ({
            name: line.name,
            count: line.quantity,
            price: line.unitPriceMinor / 100
        }))
        return {
            id: result.activityId,
            restaurant: result.restaurant,
            typeName: '',
            date: result.date,
            price: result.ticketPriceMinor / 100,
            value: result.foodValueMinor / 100,
            participants: result.diners.map(d => d.nickname),
            lines,
            rounds: result.rounds.map(round => ({
                time: result.date,
                value: round.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor, 0) / 100,
                lines: round.lines.map(line => ({
                    name: line.name,
                    count: line.quantity,
                    price: line.unitPriceMinor / 100
                }))
            })),
            result: {
                difference: result.netMinor / 100, percent: result.percent, isBreakEven: result.netMinor >= 0,
                verdict: (result.netMinor >= 0 ? 'break-even' : result.percent >= 80 ? 'close' : 'below') as 'break-even' | 'close' | 'below'
            }
        }
    }
}
