import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {HistoryViewModel} from '../presentation/history/HistoryViewModel'
import {emptyHistoryView} from '@/presentation/history/emptyHistoryView'

export const useHistoryStore = defineStore('history-view', () => {
    const snapshot = shallowRef<HistoryViewModel>(emptyHistoryView())

    function present(view: HistoryViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
