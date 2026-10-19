import {CommitRoundInput} from '../port/in/CommitRoundInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetWriter} from '../port/out/BuffetWriter'
import type {BuffetOutput} from '../port/out/BuffetOutput'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import type {RoundClock} from '../port/out/RoundClock'
import {commitSessionRound} from '../../domain/session'

export class CommitRoundInteractor implements CommitRoundInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly writer: BuffetWriter,
        private readonly output: BuffetOutput,
        private readonly catalog: CatalogGateway,
        private readonly clock: RoundClock,
    ) {
    }

    execute(_request: CommitRoundInput.Request): CommitRoundInput.Response {
        const snapshot = this.reader.load()
        const session = commitSessionRound(snapshot.session, this.catalog.products(), this.clock.roundTime())
        const committed = session !== snapshot.session
        if (committed) {
            const next = {...snapshot, session}
            this.writer.save(next)
            this.output.present(next)
        }
        return new CommitRoundInput.Response(committed, session.rounds.length)
    }
}
