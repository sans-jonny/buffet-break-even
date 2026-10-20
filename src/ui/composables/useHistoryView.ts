import {computed} from 'vue'
import {useHistoryStore} from '@/ui/stores/useHistoryStore'

/** 页面只获取只读投影，不获得 Store 写入动作。 */
export function useHistoryView() {
    const store = useHistoryStore()
    const view = computed(() => store.view)
    return {view, recordById: (id: string) => view.value.records.find(record => record.id === id)}
}
