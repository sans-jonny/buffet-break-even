import type {SavedLine} from './SavedLine'
import type {SavedRound} from './SavedRound'
import type {BreakEvenResult} from './BreakEvenResult'

export interface ReceiptViewModel {
    id: string;
    restaurant: string;
    date: string;
    price: number;
    value: number
    lines: SavedLine[];
    rounds: SavedRound[];
    dishCount: number;
    result: BreakEvenResult
}
