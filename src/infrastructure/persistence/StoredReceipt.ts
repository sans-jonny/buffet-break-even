import type {StoredLine} from './StoredLine'
import type {StoredRound} from './StoredRound'

export interface StoredReceipt {
    id: string
    restaurant: string
    date: string
    price: number
    value: number
    lines: StoredLine[]
    rounds: StoredRound[]
}
