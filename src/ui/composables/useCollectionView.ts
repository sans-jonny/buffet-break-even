import {computed} from 'vue'
import {useCollectionStore} from '@/ui/stores/useCollectionStore'

/** 页面只获取只读投影，不获得 Store 写入动作。 */
export function useCollectionView() {
    const store = useCollectionStore()
    const view = computed(() => store.view)
    return {view, receiptById: (id: string) => view.value.receipts.find(receipt => receipt.id === id)}
}
