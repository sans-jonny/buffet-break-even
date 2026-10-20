import {computed} from 'vue'
import {useDiningStore} from '@/stores/useDiningStore'

/** 页面只获取只读投影，不获得 Store 写入动作。 */
export function useDiningView() {
    const store = useDiningStore()
    const view = computed(() => store.view)
    return {
        view,
        session: computed(() => view.value.session),
        selectedLines: computed(() => view.value.selectedLines),
        currentRoundValue: computed(() => view.value.currentRoundValue),
        displayValue: computed(() => view.value.displayValue),
        totalSelectedCount: computed(() => view.value.totalSelectedCount),
        breakEven: computed(() => view.value.breakEven),
    }
}
