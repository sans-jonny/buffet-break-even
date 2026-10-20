import type {StoredRound} from './StoredRound'

export interface StoredSession {
    active: boolean
    id: string
    ticketPrice: number
    diningMode: string
    restaurant: string
    selected: Record<string, number>
    rounds: StoredRound[]
}
