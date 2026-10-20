import type {ChangeSelectionInput} from '../port/in/ChangeSelectionInput'
import type {DiningReader} from '../port/out/DiningReader'
import type {DiningWriter} from '../port/out/DiningWriter'
import type {DiningOutput} from '../port/out/DiningOutput'
import type {CatalogGateway} from '../port/out/CatalogGateway'

export class ChangeSelectionInteractor implements ChangeSelectionInput {
    constructor(
        private readonly reader: DiningReader,
        private readonly writer: DiningWriter,
        private readonly output: DiningOutput,
        private readonly catalog: CatalogGateway,
    ) {
    }

    execute(request: ChangeSelectionInput.Request): void {
        const session = this.reader.load()
        const next = session.changeSelection(request.productId, request.change, this.catalog.products())
        this.writer.save(next)
        this.output.present(next)
    }
}
