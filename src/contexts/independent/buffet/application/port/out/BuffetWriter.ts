import type {BuffetSnapshot} from '../../../domain/BuffetSnapshot'

export interface BuffetWriter {
    save(snapshot: BuffetSnapshot): void
}
