import type {RoomProduct} from '../../../model/types'

export interface RoomCatalogGateway {
    product(id: string): RoomProduct | undefined
}
