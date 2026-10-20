import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {CollectionViewModel} from '@/presentation/collection/CollectionViewModel'
import {emptyCollectionView} from '@/presentation/collection/emptyCollectionView'

export const useCollectionStore = defineStore('collection-view', () => {
    const snapshot = shallowRef<CollectionViewModel>(emptyCollectionView())

    function present(view: CollectionViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
