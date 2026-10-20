import type {DiningSession} from '../../../domain/DiningSession'

export interface DiningWriter {
    save(session: DiningSession): void
}
