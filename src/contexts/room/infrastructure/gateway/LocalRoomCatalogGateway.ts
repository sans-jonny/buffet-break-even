import type {RoomCatalogGateway} from '../../application/port/out/RoomCatalogGateway'
import type {RoomProduct} from '../../model/types'
import {products} from '@/data/catalog'

export class LocalRoomCatalogGateway implements RoomCatalogGateway {
    product(id: string): RoomProduct | undefined {
        const product = products.find(product => product.id === id)
        return product ? {id: product.id, name: product.name, price: product.price} : undefined
    }
}
