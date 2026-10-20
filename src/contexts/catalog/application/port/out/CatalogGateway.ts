import type {Product} from '../../../model/Product'

export interface CatalogGateway {
    products(): Product[]

    categories(): string[]

    levels(): string[]
}
