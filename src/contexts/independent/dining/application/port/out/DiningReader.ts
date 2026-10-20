import type {DiningSession} from '../../../domain/DiningSession'

export interface DiningReader {
    load(): DiningSession
}
