import type {CloseDiningInput} from '../port/in/CloseDiningInput'
import type {DiningReader} from '../port/out/DiningReader'
import type {DiningWriter} from '../port/out/DiningWriter'
import type {DiningOutput} from '../port/out/DiningOutput'

export class CloseDiningInteractor implements CloseDiningInput {
    constructor(private readonly reader: DiningReader, private readonly writer: DiningWriter, private readonly output: DiningOutput) {
    }

    execute(request: CloseDiningInput.Request): void {
        const current = this.reader.load()
        const next = current.close(request.sessionId)
        this.writer.save(next)
        this.output.present(next)
    }
}
