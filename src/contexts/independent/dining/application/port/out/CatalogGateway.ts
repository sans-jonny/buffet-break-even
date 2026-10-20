import type {Product} from '@/contexts/independent/dining/domain/snapshot/Product'

export interface CatalogGateway {
    products(): Product[]
}
