import type {SavedRound} from './SavedRound'

export interface DiningSessionSnapshot {
    active: boolean
    id: string
    ticketPrice: number
    diningMode: string
    restaurant: string
    selected: Record<string, number>
    rounds: SavedRound[]
}
