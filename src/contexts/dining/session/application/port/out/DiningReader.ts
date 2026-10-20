import type {DiningSession} from '../../../model/DiningSession'

export interface DiningReader {
    load(): DiningSession
}
