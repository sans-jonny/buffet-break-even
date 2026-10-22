import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import {emptyRoomView} from '@/presentation/room/emptyRoomView'
import type {RoomViewModel} from '@/presentation/room/RoomViewModel'
import type {RoomView} from '@/presentation/room/RoomView'

export const useRoomStore = defineStore('room-view', () => {
    const snapshot = shallowRef<RoomViewModel>(emptyRoomView())

    // 仅 Presenter 调用；页面获得只读视图，不能直接改业务状态。
    function present(view: RoomViewModel) {
        snapshot.value = view
    }

    const store = {view: readonly(snapshot), present}
    return store satisfies RoomView
})
