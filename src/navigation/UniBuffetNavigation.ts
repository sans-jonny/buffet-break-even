import type {BuffetNavigation, Destination} from '@/navigation/BuffetNavigation'
import type {NavigationOptions} from './NavigationOptions'
import type {NavigationPlatform} from './NavigationPlatform'

const routes: Record<Destination, string> = {
    setup: '/pages/setup/index', menu: '/pages/menu/index', mine: '/pages/mine/index',
    receipts: '/pages/receipts/index', records: '/pages/records/index'
}

export class UniBuffetNavigation implements BuffetNavigation {
    constructor(private readonly platform: NavigationPlatform, private readonly pageCount: () => number) {
    }

    private go(url: string, mode: 'push' | 'replace' | 'reset' = 'push'): Promise<void> {
        return new Promise((resolve, reject) => {
            const options = {url, success: () => resolve(), fail: () => reject(new Error('页面打开失败，请重试'))}
            if (mode === 'reset') this.platform.reLaunch(options)
            else if (mode === 'replace') this.platform.redirectTo(options)
            else this.platform.navigateTo(options)
        })
    }

    open(destination: Destination, mode: 'push' | 'replace' | 'reset' = 'push') {
        return this.go(routes[destination], mode)
    }

    toOrderSlip() {
        return this.go('/pages/order-slip/index')
    }

    toResult(receiptId?: string) {
        return this.go(`/pages/result/index${receiptId ? `?receiptId=${encodeURIComponent(receiptId)}` : ''}`)
    }

    toRecord(recordId: string) {
        return this.go(`/pages/record-detail/index?recordId=${encodeURIComponent(recordId)}`)
    }

    async back(fallback: Destination): Promise<void> {
        if (this.pageCount() <= 1) {
            await this.open(fallback, 'replace');
            return
        }
        try {
            await new Promise<void>((resolve, reject) => this.platform.navigateBack({success: resolve, fail: reject}))
        } catch {
            await this.open(fallback, 'replace')
        }
    }
}
