import {cents, sumMoney} from '../money'
import type {Participant, Product, RoomResult, RoomRound, RoomSnapshot, SavedLine, Selections} from './types'

const cloneLine = (line: SavedLine): SavedLine => ({...line})
const cloneRound = (round: RoomRound): RoomRound => ({...round, lines: round.lines.map(cloneLine)})
const cloneParticipant = (participant: Participant): Participant => ({...participant})
const cloneSelections = (selections: Selections): Selections =>
    Object.fromEntries(Object.entries(selections).map(([id, quantities]) => [id, {...quantities}]))

/** 按名称归并数量并保留首次单价，与单机 DiningResult 的规则一致。 */
function mergeLines(lines: readonly SavedLine[]): SavedLine[] {
    const merged = new Map<string, SavedLine>()
    for (const line of lines) {
        const existing = merged.get(line.name)
        if (existing) existing.count += line.count
        else merged.set(line.name, {...line})
    }
    return [...merged.values()]
}

/** 多人用餐房间聚合根。所有业务变更返回新对象，失败时旧房间仍然有效。 */
export class Room {
    private readonly state: RoomSnapshot

    private constructor(snapshot: RoomSnapshot) {
        this.state = {
            code: snapshot.code,
            hostId: snapshot.hostId,
            active: snapshot.active,
            ticketPrice: snapshot.ticketPrice,
            participants: snapshot.participants.map(cloneParticipant),
            selections: cloneSelections(snapshot.selections),
            rounds: snapshot.rounds.map(cloneRound)
        }
    }

    static create(code: string, host: Participant): Room {
        if (!code) throw new Error('房间码不能为空')
        if (!host || !host.id) throw new Error('房主编号不能为空')
        if (!host.nickname) throw new Error('昵称不能为空')
        return new Room({
            code, hostId: host.id, active: false, ticketPrice: 0,
            participants: [{...host, isHost: true}], selections: {}, rounds: []
        })
    }

    static restore(snapshot: RoomSnapshot): Room {
        return new Room(snapshot)
    }

    join(participant: Participant): Room {
        if (!participant || !participant.id) throw new Error('参与者编号不能为空')
        if (!participant.nickname) throw new Error('昵称不能为空')
        if (this.participants.some(p => p.id === participant.id)) return this
        return Room.restore({
            ...this.toSnapshot(),
            participants: [...this.participants, {...participant, isHost: false}]
        })
    }

    leave(participantId: string): Room {
        const participant = this.participants.find(p => p.id === participantId)
        if (!participant) throw new Error('参与者不存在')
        if (participant.isHost) throw new Error('房主离开将结束房间，请先结束用餐')
        const selections = cloneSelections(this.state.selections)
        delete selections[participantId]
        return Room.restore({
            ...this.toSnapshot(),
            participants: this.participants.filter(p => p.id !== participantId),
            selections
        })
    }

    rename(participantId: string, nickname: string): Room {
        if (!this.participants.some(p => p.id === participantId)) throw new Error('参与者不存在')
        if (!nickname) throw new Error('昵称不能为空')
        return Room.restore({
            ...this.toSnapshot(),
            participants: this.participants.map(p => p.id === participantId ? {...p, nickname} : {...p})
        })
    }

    begin(actorId: string, ticketPrice: number): Room {
        this.requireHost(actorId)
        if (this.active) throw new Error('用餐已开始')
        if (cents(ticketPrice) <= 0) throw new Error('请输入大于零的门票价格')
        return Room.restore({...this.toSnapshot(), active: true, ticketPrice: cents(ticketPrice) / 100})
    }

    changeSelection(participantId: string, productId: string, change: 1 | -1, products: readonly Product[]): Room {
        if (!this.active) throw new Error('请先开始用餐')
        if (!this.participants.some(p => p.id === participantId)) throw new Error('参与者不存在')
        if (!products.some(p => p.id === productId)) throw new Error('菜品不存在')
        if (change !== 1 && change !== -1) throw new Error('数量变化无效')
        const selections = cloneSelections(this.state.selections)
        const own = {...(selections[participantId] || {})}
        const count = (Object.prototype.hasOwnProperty.call(own, productId) ? own[productId] : 0) + change
        if (!Number.isSafeInteger(count)) throw new Error('数量超出支持范围')
        if (count <= 0) delete own[productId]
        else own[productId] = count
        selections[participantId] = own
        return Room.restore({...this.toSnapshot(), selections})
    }

    commitRound(participantId: string, products: readonly Product[], time: string): Room {
        if (!this.active) throw new Error('请先开始用餐')
        const participant = this.participants.find(p => p.id === participantId)
        if (!participant) throw new Error('参与者不存在')
        const own = this.state.selections[participantId] || {}
        const lines = products
            .filter(product => Object.prototype.hasOwnProperty.call(own, product.id)
                && Number.isSafeInteger(own[product.id]) && own[product.id] > 0)
            .map(product => ({name: product.name, price: product.price, count: own[product.id]}))
        if (!lines.length) return this
        const round: RoomRound = {
            participantId,
            nickname: participant.nickname,
            time,
            value: sumMoney(lines.map(line => cents(line.price) * line.count / 100)),
            lines
        }
        const selections = cloneSelections(this.state.selections)
        delete selections[participantId]
        return Room.restore({...this.toSnapshot(), selections, rounds: [...this.rounds, round]})
    }

    finish(actorId: string, date: string): RoomResult | null {
        this.requireHost(actorId)
        if (!this.active) return null
        const rounds = this.rounds
        const byParticipant = this.participants
            .map(participant => {
                const lines = mergeLines(rounds
                    .filter(round => round.participantId === participant.id)
                    .flatMap(round => round.lines))
                return {
                    participantId: participant.id,
                    nickname: participant.nickname,
                    value: sumMoney(lines.map(line => cents(line.price) * line.count / 100)),
                    lines
                }
            })
            .filter(totals => totals.lines.length > 0)
        return {
            code: this.code,
            date,
            price: this.ticketPrice,
            value: sumMoney(rounds.map(round => round.value)),
            lines: mergeLines(rounds.flatMap(round => round.lines)),
            rounds: rounds.map(cloneRound),
            byParticipant
        }
    }

    close(actorId: string): Room {
        this.requireHost(actorId)
        return Room.restore({...this.toSnapshot(), active: false, ticketPrice: 0, selections: {}, rounds: []})
    }

    private requireHost(actorId: string): void {
        const host = this.participants.find(p => p.id === actorId)
        if (!host || !host.isHost) throw new Error('只有房主可以执行此操作')
    }

    get code(): string {
        return this.state.code
    }

    get hostId(): string {
        return this.state.hostId
    }

    get active(): boolean {
        return this.state.active
    }

    get ticketPrice(): number {
        return this.state.ticketPrice
    }

    get participants(): Participant[] {
        return this.state.participants.map(cloneParticipant)
    }

    get selections(): Selections {
        return cloneSelections(this.state.selections)
    }

    get rounds(): RoomRound[] {
        return this.state.rounds.map(cloneRound)
    }

    get committedValue(): number {
        return sumMoney(this.state.rounds.map(round => round.value))
    }

    toSnapshot(): RoomSnapshot {
        return {
            code: this.code,
            hostId: this.hostId,
            active: this.active,
            ticketPrice: this.ticketPrice,
            participants: this.participants,
            selections: this.selections,
            rounds: this.rounds
        }
    }
}
