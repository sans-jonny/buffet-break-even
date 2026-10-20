import type {DiningSession} from '../../../model/DiningSession'

export interface DiningOutput {
    present(session: DiningSession): void
}
