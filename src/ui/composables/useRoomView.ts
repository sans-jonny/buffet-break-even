import {storeToRefs} from 'pinia'
import {useRoomStore} from '@/ui/stores/useRoomStore'

/** 页面的只读房间视图入口；不暴露 Presenter 的写入能力。 */
export function useRoomView() {
    const {view} = storeToRefs(useRoomStore())
    return {view}
}
