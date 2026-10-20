import type {HistoryView} from './HistoryView'

export function emptyHistoryView(): HistoryView.ViewModel {
    return {records: [], lifetimeDifference: 0, totalRoundsSaved: 0, totalDishesSaved: 0}
}
