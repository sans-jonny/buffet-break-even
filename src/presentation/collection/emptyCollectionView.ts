import type {CollectionViewModel} from './CollectionViewModel'

export function emptyCollectionView(): CollectionViewModel {
    return {receipts: []}
}
