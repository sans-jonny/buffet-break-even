import type {SavedLine} from './SavedLine'
import type {SavedRound} from './SavedRound'

export interface Receipt {
    id: string
    restaurant: string
    date: string
    price: number
    value: number
    lines: SavedLine[]
    rounds: SavedRound[]
}
