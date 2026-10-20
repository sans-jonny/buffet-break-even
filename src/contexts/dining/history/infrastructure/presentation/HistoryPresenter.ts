import type {HistoryOutput} from '../../application/port/out/HistoryOutput'
import type {DiningHistory} from '../../model/DiningHistory'
import type {HistoryView} from '@/presentation/history/HistoryView'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import {toReceiptView} from '@/presentation/receipt/toReceiptView'

export class HistoryPresenter implements HistoryOutput {
    constructor(private readonly view: HistoryView, private readonly afterCommit: AfterCommit) {
    }

    present(value: DiningHistory): void {
        const viewModel: HistoryView.ViewModel = {records: value.records.map(toReceiptView), ...value.statistics}
        this.afterCommit('dining-history', () => this.view.present(viewModel))
    }
}
