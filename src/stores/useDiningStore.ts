import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import {emptyDiningView} from '@/stores/emptyDiningView'
import type {DiningViewModel} from '@/stores/DiningViewModel'

export const useDiningStore = defineStore('dining-view', () => {
    const snapshot = shallowRef<DiningViewModel>(emptyDiningView())

    // 仅 Presenter 调用；页面获得只读视图，不能用 v-model 改业务状态。
    function present(view: DiningViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
