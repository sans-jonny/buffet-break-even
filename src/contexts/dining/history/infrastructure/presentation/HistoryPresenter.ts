import type {HistoryOutput} from '../../application/port/out/HistoryOutput'
import type {DiningHistory} from '../../model/DiningHistory'
import type {HistoryViewModel} from '@/presentation/history/HistoryViewModel'
import type {ViewStore} from '@/presentation/shared/ViewStore'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import {toReceiptView} from '@/presentation/receipt/toReceiptView'

export class HistoryPresenter implements HistoryOutput {
    constructor(private readonly store: ViewStore<HistoryViewModel>, private readonly afterCommit: AfterCommit) {
    }

    present(value: DiningHistory): void {
        const view: HistoryViewModel = {records: value.records.map(item => toReceiptView(item)), ...value.statistics}
        this.afterCommit('dining-history', () => this.store.present(view))
    }
}
