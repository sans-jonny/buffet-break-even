import type {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

export class UniBuffetNavigation implements BuffetNavigation {
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

    async back(fallback: BuffetNavigation.Destination): Promise<void> {
        if (getCurrentPages().length <= 1) {
            await this.open(fallback, 'replace');
            return
        }
        try {
            await new Promise<void>((resolve, reject) => uni.navigateBack({success: () => resolve(), fail: reject}))
        } catch {
            await this.open(fallback, 'replace')
        }
    }

    private go(url: string, mode: 'push' | 'replace' | 'reset' = 'push'): Promise<void> {
        return new Promise((resolve, reject) => {
            const options = {url, success: () => resolve(), fail: () => reject(new Error('页面打开失败，请重试'))}
            if (mode === 'reset') uni.reLaunch(options)
            else if (mode === 'replace') uni.redirectTo(options)
            else uni.navigateTo(options)
        })
    }
}
