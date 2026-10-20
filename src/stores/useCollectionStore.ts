import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {CollectionViewModel} from './CollectionViewModel'

export const useCollectionStore = defineStore('collection-view', () => {
    const snapshot = shallowRef<CollectionViewModel>({receipts: []})

    function present(view: CollectionViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
