import type {DiningReader} from '../../application/port/out/DiningReader'
import type {DiningWriter} from '../../application/port/out/DiningWriter'
import {DiningSession} from '../../model/DiningSession'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'

export class LocalDiningRepository implements DiningReader, DiningWriter {
    constructor(private readonly database: LocalDiningDatabase) {
    }

    load(): DiningSession {
        return DiningSession.restore(this.database.read('session'))
    }

    save(session: DiningSession): void {
        this.database.write('session', session.toSnapshot())
    }
}
