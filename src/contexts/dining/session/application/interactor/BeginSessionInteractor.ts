import type {BeginSessionInput} from '../port/in/BeginSessionInput'
import type {DiningReader} from '../port/out/DiningReader'
import type {DiningWriter} from '../port/out/DiningWriter'
import type {DiningOutput} from '../port/out/DiningOutput'
import type {DiningIdGenerator} from '../port/out/DiningIdGenerator'

export class BeginSessionInteractor implements BeginSessionInput {
    constructor(
        private readonly reader: DiningReader,
        private readonly writer: DiningWriter,
        private readonly output: DiningOutput,
        private readonly ids: DiningIdGenerator,
    ) {
    }

    execute(request: BeginSessionInput.Request): void {
        const session = this.reader.load()
        const next = session.begin(request.ticketPrice, request.diningMode, this.ids.createId(), request.replaceActive)
        this.writer.save(next)
        this.output.present(next)
    }
}
