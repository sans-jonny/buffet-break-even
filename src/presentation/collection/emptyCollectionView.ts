import type {CollectionView} from './CollectionView'

export function emptyCollectionView(): CollectionView.ViewModel {
    return {receipts: []}
}
