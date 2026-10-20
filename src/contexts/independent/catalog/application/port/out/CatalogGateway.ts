import type {Product} from '../../../domain/entity/Product'

export interface CatalogGateway {
    products(): Product[]

    categories(): string[]

    levels(): string[]
}
