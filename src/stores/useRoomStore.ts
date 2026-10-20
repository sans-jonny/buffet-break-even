import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import {emptyRoomView} from './emptyRoomView'
import type {RoomViewModel} from './RoomViewModel'

export const useRoomStore = defineStore('room-view', () => {
    const snapshot = shallowRef<RoomViewModel>(emptyRoomView())

    // 仅 Presenter 调用；页面获得只读视图，不能直接改业务状态。
    function present(view: RoomViewModel) {
        snapshot.value = view
    }

    return {view: readonly(snapshot), present}
})
