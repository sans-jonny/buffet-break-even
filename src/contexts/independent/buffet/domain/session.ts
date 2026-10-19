import type {DiningSession} from '@/contexts/independent/buffet/domain/DiningSession'
import type {Product} from '@/contexts/independent/buffet/domain/Product'
import {cents} from '@/contexts/independent/buffet/domain/money'
import {getSelectedLines} from '@/contexts/independent/buffet/domain/selection'
import {buildRound} from '@/contexts/independent/buffet/domain/rounds'

export function createSession(): DiningSession {
    return {active: false, id: '', ticketPrice: 200, diningMode: '单人', restaurant: '牛牛', selected: {}, rounds: []}
}

export function createDiningSession(price: number, mode: string, id: string): DiningSession {
    if (cents(price) <= 0) throw new Error('请输入大于零的门票价格')
    if (mode !== '单人' && mode !== '多人') throw new Error('用餐模式无效')
    if (!id) throw new Error('用餐编号不能为空')
    return {...createSession(), active: true, id, ticketPrice: cents(price) / 100, diningMode: mode}
}

export function commitSessionRound(session: DiningSession, catalog: readonly Product[], time: string): DiningSession {
    const lines = getSelectedLines(catalog, session.selected)
    if (!session.active || !lines.length) return session
    return {...session, selected: {}, rounds: [...session.rounds, buildRound(lines, time)]}
}
