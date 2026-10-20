import type {DiningOutput} from '../../application/port/out/DiningOutput'
import type {CatalogGateway} from '../../application/port/out/CatalogGateway'
import type {ReceiptClock} from '../../application/port/out/ReceiptClock'
import type {DiningSession} from '../../model/DiningSession'
import type {DiningView} from '@/presentation/dining/DiningView'
import type {ProductAppearanceProvider} from '@/presentation/dining/ProductAppearanceProvider'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import {toDiningView} from './toDiningView'

export class DiningPresenter implements DiningOutput {
    constructor(private readonly view: DiningView,
                private readonly appearance: ProductAppearanceProvider,
                private readonly catalog: CatalogGateway,
                private readonly clock: ReceiptClock,
                private readonly afterCommit: AfterCommit) {
    }

    present(session: DiningSession): void {
        const viewModel: DiningView.ViewModel = toDiningView(session, this.catalog.products(), this.clock.receiptDate(), this.appearance)
        this.afterCommit('dining', () => this.view.present(viewModel))
    }
}
