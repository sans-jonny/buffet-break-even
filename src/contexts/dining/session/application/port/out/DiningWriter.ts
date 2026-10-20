import type {DiningSession} from '../../../model/DiningSession'

export interface DiningWriter {
    save(session: DiningSession): void
}
