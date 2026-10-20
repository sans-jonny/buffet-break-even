import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {HistoryViewModel} from './HistoryViewModel'

export const useHistoryStore = defineStore('history-view', () => {
    const snapshot = shallowRef<HistoryViewModel>({
        records: [],
        lifetimeDifference: 0,
        totalRoundsSaved: 0,
        totalDishesSaved: 0
    })

    function present(view: HistoryViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
