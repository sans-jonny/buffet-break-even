import type {Product} from '@/contexts/dining/session/model/snapshot/Product'

export interface CatalogGateway {
    products(): Product[]
}
