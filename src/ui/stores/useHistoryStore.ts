import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {HistoryViewModel} from '@/presentation/history/HistoryViewModel'
import type {ViewStore} from '@/presentation/shared/ViewStore'
import {emptyHistoryView} from '@/presentation/history/emptyHistoryView'

export const useHistoryStore = defineStore('history-view', () => {
    const snapshot = shallowRef<HistoryViewModel>(emptyHistoryView())

    function present(view: HistoryViewModel) {
        snapshot.value = view
    }

    const store = {view: readonly(snapshot), present}
    return store satisfies ViewStore<HistoryViewModel>
})
