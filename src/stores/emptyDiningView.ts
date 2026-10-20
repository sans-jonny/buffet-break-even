import type {DiningViewModel} from './DiningViewModel'
import type {BreakEvenResult} from './BreakEvenResult'

export function emptyDiningView(): DiningViewModel {
    const result: BreakEvenResult = {difference: -200, percent: 0, isBreakEven: false, verdict: 'below'}
    return {
        session: {active: false, id: '', ticketPrice: 200, diningMode: '单人', selected: {}, rounds: []},
        selectedLines: [],
        currentRoundValue: 0,
        displayValue: 0,
        totalSelectedCount: 0,
        breakEven: result,
        canFinish: false,
        previewReceipt: {
            id: '',
            restaurant: '',
            date: '',
            price: 200,
            value: 0,
            lines: [],
            rounds: [],
            dishCount: 0,
            result: {...result}
        }
    }
}
