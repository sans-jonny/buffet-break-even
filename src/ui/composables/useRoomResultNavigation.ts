import {watch} from 'vue'
import {useRoomStore} from '@/ui/stores/useRoomStore'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useRequired} from './useRequired'
import {runAction} from './runAction'

/** 全局处理结束广播，成员停留在任意页面也会进入同一份最终结果。 */
export function useRoomResultNavigation() {
    const room = useRoomStore(), application = useApplicationStore()
    const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
    let opening = false, displayedRoomId = ''
    const check = () => runAction(async () => {
        const snapshot = room.view.snapshot
        if (snapshot?.status !== 'ended') {displayedRoomId = ''; return}
        if (!application.ready || !snapshot.receipt || opening) return
        const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
        const page = pages[pages.length - 1] as
            {route?: string; options?: {receiptId?: string}} | undefined
        if (!page) return
        if (pages.length === 1 && page.route === 'pages/result/index' && !page.options?.receiptId) {
            displayedRoomId = snapshot.id
            return
        }
        if (displayedRoomId === snapshot.id) return
        opening = true
        try {
            // 清除用餐页面栈，系统返回也不会重新进入已结束的菜单。
            await navigation.toResult(undefined, 'reset')
            displayedRoomId = snapshot.id
        } finally {opening = false}
    })
    watch(() => [application.ready, room.view.snapshot], () => {void check()}, {immediate:true})
    return check
}
