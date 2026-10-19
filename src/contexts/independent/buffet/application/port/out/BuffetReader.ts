import type {BuffetSnapshot} from '../../../domain/BuffetSnapshot'

export interface BuffetReader {
    load(): BuffetSnapshot
}
