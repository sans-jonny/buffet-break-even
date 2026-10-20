import type {DiningSessionSnapshot} from './snapshot/DiningSessionSnapshot'
import type {Product} from './snapshot/Product'
import type {SavedRound} from './snapshot/SavedRound'
import {DiningSelection} from './DiningSelection'
import {DiningRound} from './DiningRound'
import {DiningResult} from './DiningResult'
import {cents, sumMoney} from '@/utils/money'

/** 用餐聚合根。所有业务变更返回新聚合，持久化失败时旧会话仍然有效。 */
export class DiningSession {
    private readonly selection: DiningSelection
    private readonly history: DiningRound[]
    private readonly state: Omit<DiningSessionSnapshot, 'selected' | 'rounds'>

    private constructor(snapshot: DiningSessionSnapshot) {
        this.state = {
            active: snapshot.active, id: snapshot.id, ticketPrice: snapshot.ticketPrice,
            diningMode: snapshot.diningMode, restaurant: snapshot.restaurant
        }
        this.selection = new DiningSelection(snapshot.selected)
        this.history = snapshot.rounds.map(round => DiningRound.restore(round))
    }

    static empty(): DiningSession {
        return new DiningSession({
            active: false,
            id: '',
            ticketPrice: 200,
            diningMode: '单人',
            restaurant: '牛牛',
            selected: {},
            rounds: []
        })
    }

    static restore(snapshot: DiningSessionSnapshot): DiningSession {
        return new DiningSession(snapshot)
    }

    begin(price: number, mode: string, id: string, replaceActive = false): DiningSession {
        if (this.active && !replaceActive) throw new Error('当前用餐尚未结束，请继续用餐或确认重新开始')
        if (cents(price) <= 0) throw new Error('请输入大于零的门票价格')
        if (mode !== '单人' && mode !== '多人') throw new Error('用餐模式无效')
        if (!id) throw new Error('用餐编号不能为空')
        return DiningSession.restore({
            ...DiningSession.empty().toSnapshot(), active: true, id,
            ticketPrice: cents(price) / 100, diningMode: mode
        })
    }

    changeSelection(productId: string, change: 1 | -1, catalog: readonly Product[]): DiningSession {
        if (!this.active) throw new Error('请先开始用餐')
        if (!catalog.some(product => product.id === productId)) throw new Error('菜品不存在')
        return DiningSession.restore({
            ...this.toSnapshot(),
            selected: this.selection.change(productId, change).toSnapshot()
        })
    }

    commitRound(catalog: readonly Product[], time: string): DiningSession {
        const lines = this.selection.resolve(catalog)
        if (!this.active || !lines.length) return this
        return DiningSession.restore({
            ...this.toSnapshot(), selected: {},
            rounds: [...this.rounds, DiningRound.create(lines, time).toSnapshot()]
        })
    }

    preview(catalog: readonly Product[], date: string): DiningResult {
        return DiningResult.from(this, date, this.selection.resolve(catalog))
    }

    prepareCompletion(catalog: readonly Product[], time: string, date: string): DiningResult | null {
        const final = this.commitRound(catalog, time)
        return final.active && final.history.length ? DiningResult.from(final, date) : null
    }

    close(expectedId: string): DiningSession {
        if (!this.active || this.id !== expectedId) throw new Error('当前用餐已变更，请重试')
        return DiningSession.empty()
    }

    selectedLines(catalog: readonly Product[]) {
        return this.selection.resolve(catalog)
    }

    selectedCount(catalog: readonly Product[]): number {
        return this.selection.count(catalog)
    }

    canFinish(catalog: readonly Product[]): boolean {
        return this.active && (this.history.length > 0 || this.selection.resolve(catalog).length > 0)
    }

    get active() {
        return this.state.active
    }

    get id() {
        return this.state.id
    }

    get ticketPrice() {
        return this.state.ticketPrice
    }

    get diningMode() {
        return this.state.diningMode
    }

    get restaurant() {
        return this.state.restaurant
    }

    get selected() {
        return this.selection.toSnapshot()
    }

    get rounds(): SavedRound[] {
        return this.history.map(round => round.toSnapshot())
    }

    get committedValue(): number {
        return sumMoney(this.history.map(round => round.value))
    }

    toSnapshot(): DiningSessionSnapshot {
        return {
            active: this.active, id: this.id, ticketPrice: this.ticketPrice, diningMode: this.diningMode,
            restaurant: this.restaurant, selected: this.selected, rounds: this.rounds
        }
    }
}
