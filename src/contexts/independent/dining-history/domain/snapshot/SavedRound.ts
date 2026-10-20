import type {SavedLine} from './SavedLine'

export interface SavedRound {
    time: string;
    value: number;
    lines: SavedLine[]
}
