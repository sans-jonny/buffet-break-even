import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {CollectionView} from '@/presentation/collection/CollectionView'
import {emptyCollectionView} from '@/presentation/collection/emptyCollectionView'

export const useCollectionStore = defineStore('collection-view', () => {
    const snapshot = shallowRef<CollectionView.ViewModel>(emptyCollectionView())
    const view = readonly(snapshot)

    function receiptById(id: string) {
        return view.value.receipts.find(receipt => receipt.id === id)
    }

    function present(viewModel: CollectionView.ViewModel) {
        snapshot.value = viewModel
    }

    const store = {view, receiptById, present}
    return store satisfies CollectionView
})
