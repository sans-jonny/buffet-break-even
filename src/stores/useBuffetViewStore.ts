import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import {emptyBuffetView} from '@/stores/emptyBuffetView'
import type {BuffetViewModel} from '@/stores/BuffetViewModel'

export const useBuffetViewStore = defineStore('buffet-view', () => {
    const snapshot = shallowRef<BuffetViewModel>(emptyBuffetView())

    // 仅 Presenter 调用；页面获得只读视图，不能用 v-model 改业务状态。
    function present(view: BuffetViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
