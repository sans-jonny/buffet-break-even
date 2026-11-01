import {type App, type Ref, ref} from 'vue'
import {DiningDevice} from '../composition/DiningDevice'
import {Dining} from '../coordination/application/port/in/Dining'

/** UI adapter: parses inputs, maps view models, and invokes application workflows. */
export class DiningClient {
    static readonly token = Symbol('DiningClient')
    readonly revision: Ref<number> = ref(0)
    readonly ready: Promise<void>
    readonly dining: ReturnType<typeof DiningDevice.create>['dining']
    private readonly stopRoomWatching: () => void
    private readonly sessions: ReturnType<typeof DiningDevice.create>['sessions']
    private readonly preferences: ReturnType<typeof DiningDevice.create>['preferences']

    constructor(baseUrl: string, vueApp?: App) {
        const app = DiningDevice.create(baseUrl, DiningClient.id, () => { this.revision.value++ }, DiningClient.report, vueApp)
        this.stopRoomWatching = app.stopRoomWatching
        this.dining = app.dining
        this.sessions = app.sessions
        this.preferences = app.preferences
        this.ready = this.sessions.initialize()
    }

    static id(): string {
        // Anonymous installation identity, not an authentication credential.
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
    }

    static minor(input: string): number {
        if (!/^\d+(?:\.\d{1,2})?$/.test(input.trim())) throw new Error('请输入最多两位小数的金额')
        const [integer, fraction = ''] = input.trim().split('.')
        const minor = Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
        if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('金额过大')
        return minor
    }

    static receipt(result: Dining.Result) {
        const lines = result.lines.map(line => ({
            name: line.name,
            count: line.quantity,
            price: line.unitPriceMinor / 100
        }))
        return {
            id: result.activityId,
            restaurant: result.restaurant,
            typeName: '',
            date: result.date,
            price: result.ticketPriceMinor / 100,
            value: result.foodValueMinor / 100,
            participants: result.diners.map(d => d.nickname),
            lines,
            rounds: result.rounds.map(round => ({
                time: result.date,
                value: round.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor, 0) / 100,
                lines: round.lines.map(line => ({
                    name: line.name,
                    count: line.quantity,
                    price: line.unitPriceMinor / 100
                }))
            })),
            result: {
                difference: result.netMinor / 100, percent: result.percent, isBreakEven: result.netMinor >= 0,
                verdict: (result.netMinor >= 0 ? 'break-even' : result.percent >= 80 ? 'close' : 'below') as 'break-even' | 'close' | 'below'
            }
        }
    }

    static report(error: unknown): void {
        const messages: Record<string, string> = {
            UNKNOWN_COMMIT_OUTCOME: '提交结果待确认，请先核对房间记录，勿重复加量',
            SYNC_PENDING: '已提交，正在恢复同步',
            HOST_REQUIRED: '此操作需要当前房主',
            ALREADY_ENDED: '用餐已经结束',
            EMPTY_ROUND: '空轮次不能提交',
            INSUFFICIENT_QUANTITY: '当前数量不足',
            RECOVERY_REQUIRED: '本地数据需要恢复，请保留数据并检查备份',
            DISCONNECTED: '房间连接断开，正在通过历史日志补齐',
            RESTAURANT_CATEGORY_EMPTY: '该分类暂无可用餐厅',
            RESTAURANT_NOT_IN_ACTIVITY: '该餐厅不属于本次用餐'
        }
        const message = error instanceof Error ? error.message : '操作失败，请重试'
        uni.showToast({title: messages[message] || message, icon: 'none'})
    }

    selectedRestaurant(): string {
        const selected = this.preferences.selectedRestaurant(), restaurants = this.dining.restaurants()
        return restaurants.some(r => r.id === selected) ? selected! : restaurants[0]?.id || ''
    }

    async selectRestaurant(id: string): Promise<void> {
        await this.preferences.selectRestaurant(id)
    }

    async startSingle(total: string, categoryId: string, replaceActivityId?: string): Promise<void> {
        await this.ready
        await this.dining.startSingle(DiningClient.minor(total), categoryId, replaceActivityId)
        this.stopRoomWatching()
    }

    async resumeSingle(session: Dining.Session): Promise<void> {
        await this.ready
        await this.dining.selectSession(session)
        this.stopRoomWatching()
    }

    async createRoom(total: string, categoryId: string): Promise<void> {
        await this.ready
        await this.sessions.createRoom(DiningClient.minor(total), categoryId)
    }

    async joinRoom(code?: string): Promise<void> {
        await this.ready
        await this.sessions.joinRoom(code)
    }

    async refresh(): Promise<void> {
        await this.ready
        await this.sessions.refresh()
        this.revision.value++
    }

    async leaveRoom(): Promise<void> {
        await this.ready
        await this.sessions.leaveRoom()
    }

    async acknowledgeSubmission(): Promise<void> {
        await this.ready
        await this.sessions.acknowledgeSubmission()
    }
}
