import type {DiningSession} from '../../../domain/DiningSession'

export interface DiningOutput {
    present(session: DiningSession): void
}
