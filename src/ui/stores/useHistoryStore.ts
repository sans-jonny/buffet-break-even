import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {HistoryView} from '@/presentation/history/HistoryView'
import {emptyHistoryView} from '@/presentation/history/emptyHistoryView'

export const useHistoryStore = defineStore('history-view', () => {
    const snapshot = shallowRef<HistoryView.ViewModel>(emptyHistoryView())
    const view = readonly(snapshot)

    function recordById(id: string) {
        return view.value.records.find(record => record.id === id)
    }

    function present(viewModel: HistoryView.ViewModel) {
        snapshot.value = viewModel
    }

    const store = {view, recordById, present}
    return store satisfies HistoryView
})
