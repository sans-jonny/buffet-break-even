import type {BeginSessionInput} from '../port/in/BeginSessionInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetWriter} from '../port/out/BuffetWriter'
import type {BuffetOutput} from '../port/out/BuffetOutput'
import type {DiningIdGenerator} from '../port/out/DiningIdGenerator'
import {createDiningSession} from '../../domain/session'

export class BeginSessionInteractor implements BeginSessionInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly writer: BuffetWriter,
        private readonly output: BuffetOutput,
        private readonly ids: DiningIdGenerator,
    ) {
    }

    execute(request: BeginSessionInput.Request): void {
        const snapshot = this.reader.load()
        if (snapshot.session.active && !request.replaceActive) throw new Error('当前用餐尚未结束，请继续用餐或确认重新开始')
        const next = {
            ...snapshot,
            session: createDiningSession(request.ticketPrice, request.diningMode, this.ids.createId())
        }
        this.writer.save(next)
        this.output.present(next)
    }
}
