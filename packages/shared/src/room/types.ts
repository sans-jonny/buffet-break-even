// 多人房间领域类型。与单机 Dining 领域相互独立：房间状态只存在于服务端内存，
// 结束时再映射回前端已有的历史 / 收藏持久化格式，因此不迁移 buffet-state-v3。

export interface Product {
    id: string
    name: string
    price: number
}

export interface Participant {
    id: string
    nickname: string
    isHost: boolean
}

export interface SavedLine {
    name: string
    price: number
    count: number
}

/** 一轮由单个参与者提交，快照提交时的昵称保证"当时是谁"不随改名漂移。 */
export interface RoomRound {
    participantId: string
    nickname: string
    time: string
    value: number
    lines: SavedLine[]
}

/** 每个参与者的待选数量，按参与者分片，避免多人并发写同一份待选。 */
export type Selections = Record<string, Record<string, number>>

export interface RoomSnapshot {
    code: string
    hostId: string
    active: boolean
    ticketPrice: number
    participants: Participant[]
    selections: Selections
    rounds: RoomRound[]
}

/** 某个参与者的汇总：按名称归并后的明细与合计价值。 */
export interface ParticipantTotals {
    participantId: string
    nickname: string
    value: number
    lines: SavedLine[]
}

export interface RoomResult {
    code: string
    date: string
    price: number
    value: number
    /** 全部已提交轮次按名称归并的合计明细，用于历史 / 小票持久化。 */
    lines: SavedLine[]
    rounds: RoomRound[]
    /** 按参与者归并的分账视图，回答"每个人点了啥、花了多少"。 */
    byParticipant: ParticipantTotals[]
}
