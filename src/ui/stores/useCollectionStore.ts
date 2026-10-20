import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {CollectionView} from '@/presentation/collection/CollectionView'
import {emptyCollectionView} from '@/presentation/collection/emptyCollectionView'

export const useCollectionStore = defineStore('collection-view', () => {
    const snapshot = shallowRef<CollectionView.ViewModel>(emptyCollectionView())

    function present(viewModel: CollectionView.ViewModel) {
        snapshot.value = viewModel
    }

    const store = {view: readonly(snapshot), present}
    return store satisfies CollectionView
})
