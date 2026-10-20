import {cents} from './money'

export function calculateBreakEven(value: number, price: number) {
    const earned = cents(value)
    const ticket = cents(price)
    return {
        difference: (earned - ticket) / 100, percent: ticket ? Math.round(earned / ticket * 100) : 0,
        isBreakEven: earned >= ticket,
        verdict: earned >= ticket ? 'break-even' as const : earned >= ticket * 0.6 ? 'close' as const : 'below' as const
    }
}
