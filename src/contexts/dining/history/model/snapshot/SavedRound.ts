import type {SavedLine} from './SavedLine'

export interface SavedRound {
    readonly time: string;
    readonly value: number;
    readonly lines: readonly SavedLine[]
}
