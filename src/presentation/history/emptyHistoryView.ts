import type {HistoryViewModel} from './HistoryViewModel'

export function emptyHistoryView(): HistoryViewModel {
    return {records: [], lifetimeDifference: 0, totalRoundsSaved: 0, totalDishesSaved: 0}
}
