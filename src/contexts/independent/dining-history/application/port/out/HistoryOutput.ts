import type {DiningHistory} from '../../../domain/collection/DiningHistory'

export interface HistoryOutput {
    present(value: DiningHistory): void
}
