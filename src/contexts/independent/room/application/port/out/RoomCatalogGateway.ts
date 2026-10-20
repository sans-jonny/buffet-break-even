import type {RoomProduct} from '../../types'

export interface RoomCatalogGateway {
    product(id: string): RoomProduct | undefined
}
