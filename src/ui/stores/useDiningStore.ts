import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import {emptyDiningView} from '@/presentation/dining/emptyDiningView'
import type {DiningViewModel} from '@/presentation/dining/DiningViewModel'
import type {ViewStore} from '@/presentation/shared/ViewStore'

export const useDiningStore = defineStore('dining-view', () => {
    const snapshot = shallowRef<DiningViewModel>(emptyDiningView())

    // 仅 Presenter 调用；页面获得只读视图，不能用 v-model 改业务状态。
    function present(view: DiningViewModel) {
        snapshot.value = view
    }

    const store = {view: readonly(snapshot), present}
    return store satisfies ViewStore<DiningViewModel>
})
