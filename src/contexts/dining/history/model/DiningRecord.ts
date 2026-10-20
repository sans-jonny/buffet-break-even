import type {SavedLine} from './snapshot/SavedLine'
import type {SavedRound} from './snapshot/SavedRound'

export interface DiningRecord {
    readonly id: string
    readonly restaurant: string
    readonly date: string
    readonly price: number
    readonly value: number
    readonly lines: readonly SavedLine[]
    readonly rounds: readonly SavedRound[]
}
