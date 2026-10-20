import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import {emptyDiningView} from '@/presentation/dining/emptyDiningView'
import type {DiningView} from '@/presentation/dining/DiningView'

export const useDiningStore = defineStore('dining-view', () => {
    const snapshot = shallowRef<DiningView.ViewModel>(emptyDiningView())

    // 仅 Presenter 调用；页面获得只读视图，不能用 v-model 改业务状态。
    function present(viewModel: DiningView.ViewModel) {
        snapshot.value = viewModel
    }

    const store = {view: readonly(snapshot), present}
    return store satisfies DiningView
})
