import type {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {ref} from 'vue'

export class UniBuffetNavigation implements BuffetNavigation {
    private readonly pending = ref(0)
    private tail: Promise<void> = Promise.resolve()
    private latest?: {key: string; promise: Promise<void>}

    isNavigating(): boolean { return this.pending.value > 0 }
    private static readonly routes: Record<BuffetNavigation.Destination, string> = {
        setup: '/pages/setup/index', menu: '/pages/menu/index', mine: '/pages/mine/index',
        receipts: '/pages/receipts/index', records: '/pages/records/index', 'custom-menu': '/pages/custom-menu/index',
        creator: '/pages/creator/index'
    }

    open(destination: BuffetNavigation.Destination, mode: 'push' | 'replace' | 'reset' = 'push') {
        return this.go(UniBuffetNavigation.routes[destination], mode)
    }

    toOrderSlip() {
        return this.go('/pages/order-slip/index')
    }

    toResult(receiptId?: string, mode: 'push' | 'replace' | 'reset' = 'push') {
        return this.go(`/pages/result/index${receiptId ? `?receiptId=${encodeURIComponent(receiptId)}` : ''}`, mode)
    }

    toRecord(recordId: string) {
        return this.go(`/pages/record-detail/index?recordId=${encodeURIComponent(recordId)}`)
    }

    toCustomMenu(restaurantId?: string) {
        return this.go(`/pages/custom-menu/index${restaurantId ? '?restaurantId=' + encodeURIComponent(restaurantId) : ''}`)
    }

    toMenuPreview(previewId: string) {
        return this.go(`/pages/menu/index?previewId=${encodeURIComponent(previewId)}`)
    }

    back(fallback: BuffetNavigation.Destination): Promise<void> {
        return this.navigate('back:' + fallback, async () => {
            if (getCurrentPages().length <= 1) return this.performGo(UniBuffetNavigation.routes[fallback], 'replace')
            try {
                await new Promise<void>((resolve, reject) => uni.navigateBack({success: () => resolve(), fail: reject}))
            } catch {
                await this.performGo(UniBuffetNavigation.routes[fallback], 'replace')
            }
        })
    }

    private go(url: string, mode: 'push' | 'replace' | 'reset' = 'push'): Promise<void> {
        return this.navigate(mode + ':' + url, () => this.performGo(url, mode))
    }

    private navigate(key: string, action: () => Promise<void>): Promise<void> {
        if (this.latest?.key === key) return this.latest.promise
        this.pending.value++
        const promise = this.tail.catch(() => {}).then(action).finally(() => {
            this.pending.value--
            if (this.latest?.promise === promise) this.latest = undefined
        })
        this.tail = promise
        this.latest = {key, promise}
        return promise
    }

    private performGo(url: string, mode: 'push' | 'replace' | 'reset'): Promise<void> {
        return new Promise((resolve, reject) => {
            const options = {url, success: () => resolve(), fail: () => reject(new Error('页面打开失败，请重试'))}
            if (mode === 'reset') uni.reLaunch(options)
            else if (mode === 'replace') uni.redirectTo(options)
            else uni.navigateTo(options)
        })
    }
}
