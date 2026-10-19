import type {Product} from '../../../domain/Product'

export interface CatalogGateway {
    products(): Product[]

    categories(): string[]

    levels(): string[]
}
