import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {HistoryView} from '@/presentation/history/HistoryView'
import {emptyHistoryView} from '@/presentation/history/emptyHistoryView'

export const useHistoryStore = defineStore('history-view', () => {
    const snapshot = shallowRef<HistoryView.ViewModel>(emptyHistoryView())

    function present(viewModel: HistoryView.ViewModel) {
        snapshot.value = viewModel
    }

    const store = {view: readonly(snapshot), present}
    return store satisfies HistoryView
})
