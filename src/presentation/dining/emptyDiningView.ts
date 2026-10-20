import type {DiningView} from './DiningView'
import type {BreakEvenView} from '../shared/BreakEvenView'

export function emptyDiningView(): DiningView.ViewModel {
    const result: BreakEvenView = {difference: -200, percent: 0, isBreakEven: false, verdict: 'below'}
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
            restaurant: '牛牛',
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
