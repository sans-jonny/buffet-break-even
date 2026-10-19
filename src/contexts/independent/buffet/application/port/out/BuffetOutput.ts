import type {BuffetSnapshot} from '../../../domain/BuffetSnapshot'

export interface BuffetOutput {
    present(snapshot: BuffetSnapshot): void
}
