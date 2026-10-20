import type {StoredLine} from './StoredLine'

export interface StoredRound {
    time: string;
    value: number;
    lines: StoredLine[]
}
