import type {Product} from '@/contexts/independent/buffet/domain/Product'

export interface CatalogGateway {
    products(): Product[]
}
