import type {HistoryOutput} from '../../application/port/out/HistoryOutput'
import type {DiningHistory} from '../../domain/collection/DiningHistory'
import type {HistoryViewModel} from '@/stores/HistoryViewModel'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {toReceiptView} from '@/stores/toReceiptView'

export class HistoryPresenter implements HistoryOutput {
    constructor(private readonly store: {
        present(view: HistoryViewModel): void
    }, private readonly database: LocalDiningDatabase) {
    }

    present(value: DiningHistory): void {
        const view: HistoryViewModel = {records: value.records.map(item => toReceiptView(item)), ...value.statistics}
        this.database.afterCommit('dining-history', () => this.store.present(view))
    }
}
