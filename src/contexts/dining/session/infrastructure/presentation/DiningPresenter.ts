import type {DiningOutput} from '../../application/port/out/DiningOutput'
import type {CatalogGateway} from '../../application/port/out/CatalogGateway'
import type {ReceiptClock} from '../../application/port/out/ReceiptClock'
import type {DiningSession} from '../../model/DiningSession'
import type {DiningViewModel} from '@/presentation/dining/DiningViewModel'
import type {ProductAppearanceProvider} from '@/presentation/dining/ProductAppearanceProvider'
import type {ViewStore} from '@/presentation/shared/ViewStore'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import {toDiningView} from './toDiningView'

export class DiningPresenter implements DiningOutput {
    constructor(private readonly store: ViewStore<DiningViewModel>,
                private readonly appearance: ProductAppearanceProvider,
                private readonly catalog: CatalogGateway,
                private readonly clock: ReceiptClock,
                private readonly afterCommit: AfterCommit) {
    }

    present(session: DiningSession): void {
        const view = toDiningView(session, this.catalog.products(), this.clock.receiptDate(), this.appearance)
        this.afterCommit('dining', () => this.store.present(view))
    }
}
