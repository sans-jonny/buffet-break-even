import type {ChangeSelectionInput} from '../port/in/ChangeSelectionInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetWriter} from '../port/out/BuffetWriter'
import type {BuffetOutput} from '../port/out/BuffetOutput'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import {changeSelection} from '../../domain/selection'

export class ChangeSelectionInteractor implements ChangeSelectionInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly writer: BuffetWriter,
        private readonly output: BuffetOutput,
        private readonly catalog: CatalogGateway,
    ) {
    }

    execute(request: ChangeSelectionInput.Request): void {
        const snapshot = this.reader.load()
        if (!snapshot.session.active) throw new Error('请先开始用餐')
        if (!this.catalog.products().some(product => product.id === request.productId)) throw new Error('菜品不存在')
        const next = {
            ...snapshot, session: {
                ...snapshot.session,
                selected: changeSelection(snapshot.session.selected, request.productId, request.change)
            }
        }
        this.writer.save(next)
        this.output.present(next)
    }
}
