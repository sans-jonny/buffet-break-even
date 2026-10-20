import {CommitRoundInput} from '../port/in/CommitRoundInput'
import type {DiningReader} from '../port/out/DiningReader'
import type {DiningWriter} from '../port/out/DiningWriter'
import type {DiningOutput} from '../port/out/DiningOutput'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import type {RoundClock} from '../port/out/RoundClock'

export class CommitRoundInteractor implements CommitRoundInput {
    constructor(
        private readonly reader: DiningReader,
        private readonly writer: DiningWriter,
        private readonly output: DiningOutput,
        private readonly catalog: CatalogGateway,
        private readonly clock: RoundClock,
    ) {
    }

    execute(_request: CommitRoundInput.Request): CommitRoundInput.Response {
        const session = this.reader.load()
        const next = session.commitRound(this.catalog.products(), this.clock.roundTime())
        const committed = next !== session
        if (committed) {
            this.writer.save(next)
            this.output.present(next)
        }
        return new CommitRoundInput.Response(committed, next.rounds.length)
    }
}
