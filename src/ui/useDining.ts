import {inject, onScopeDispose} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {DiningClient} from './DiningClient'

export function useDining(): DiningClient {
    const client = inject<DiningClient>(DiningClient.token)
    if (!client) throw new Error('DiningClient 未注册')
    let disposed = false
    onScopeDispose(() => {
        disposed = true
    })
    onShow(async () => {
        if (!disposed) {
            try {
                await client.refresh()
            } catch (error) {
                DiningClient.report(error)
            }
        }
    })
    return client
}
