import type {DiningHistory} from '../../../model/DiningHistory'

export interface HistoryOutput {
    present(value: DiningHistory): void
}
