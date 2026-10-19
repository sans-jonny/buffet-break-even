import type {BuffetViewModel} from './BuffetViewModel'
import type {BreakEvenResult} from './BreakEvenResult'

export function emptyBuffetView(): BuffetViewModel {
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
        },
        records: [],
        receipts: [],
        lifetimeDifference: 0,
        totalRoundsSaved: 0,
        totalDishesSaved: 0
    }
}
