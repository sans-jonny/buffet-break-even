import type {RoomOutput} from '../../application/port/out/RoomOutput'
import type {RoomCatalogGateway} from '../../application/port/out/RoomCatalogGateway'
import type {
    RoomConnectionStatus,
    RoomCredentials,
    RoomError,
    RoomResult,
    RoomSnapshot
} from '../../application/types'
import type {RoomViewModel} from '@/stores/RoomViewModel'
import {sumMoney} from '@/utils/money'

export class RoomPresenter implements RoomOutput {
    private selfId = ''
    private roomCode = ''
    private connection: 'idle' | 'connecting' | 'open' | 'closed' = 'idle'
    private snapshot: RoomSnapshot | null = null
    private result: RoomResult | null = null
    private error = ''

    constructor(private readonly store: {present(view: RoomViewModel): void},
                private readonly catalog: RoomCatalogGateway,
                private readonly appearance: (id: string) => {emoji: string; gradient: string}) {
    }

    presentConnection(status: RoomConnectionStatus, detail?: string): void {
        this.connection = status === 'error' ? 'closed' : status
        if (status === 'error') this.error = detail || '连接失败，请重试'
        this.publish()
    }

    presentCredentials(credentials: RoomCredentials): void {
        this.selfId = credentials.participantId
        this.roomCode = credentials.roomCode
        this.error = ''
        this.publish()
    }

    presentState(snapshot: RoomSnapshot): void {
        this.snapshot = snapshot
        this.roomCode = snapshot.code
        this.error = ''
        this.publish()
    }

    presentResult(result: RoomResult): void {
        this.result = result
        this.error = ''
        this.publish()
    }

    presentError(error: RoomError): void {
        this.error = error.message
        this.publish()
    }

    presentEnded(): void {
        this.selfId = ''
        this.roomCode = ''
        this.snapshot = null
        this.result = null
        this.connection = 'closed'
        this.publish()
    }

    presentLeft(): void {
        this.presentEnded()
    }

    private publish(): void {
        this.store.present(this.build())
    }

    private build(): RoomViewModel {
        const snapshot = this.snapshot
        return {
            connection: this.connection,
            roomCode: this.roomCode,
            selfId: this.selfId,
            active: snapshot?.active ?? false,
            ticketPrice: snapshot?.ticketPrice ?? 0,
            participants: (snapshot?.participants ?? []).map(p => ({
                id: p.id, nickname: p.nickname, isHost: p.isHost, isSelf: p.id === this.selfId
            })),
            selections: (snapshot?.participants ?? []).map(p => ({
                participantId: p.id,
                nickname: p.nickname,
                lines: Object.entries(snapshot?.selections?.[p.id] ?? {}).map(([id, count]) => {
                    const product = this.catalog.product(id)
                    const appearance = this.appearance(id)
                    return {
                        id,
                        name: product?.name ?? id,
                        price: product?.price ?? 0,
                        count,
                        emoji: appearance.emoji,
                        gradient: appearance.gradient
                    }
                })
            })),
            rounds: (snapshot?.rounds ?? []).map(r => ({
                participantId: r.participantId, nickname: r.nickname, time: r.time, value: r.value, lines: r.lines
            })),
            committedValue: sumMoney((snapshot?.rounds ?? []).map(r => r.value)),
            result: this.result ? {
                date: this.result.date,
                price: this.result.price,
                value: this.result.value,
                lines: this.result.lines,
                rounds: this.result.rounds,
                byParticipant: this.result.byParticipant
            } : null,
            error: this.error
        }
    }
}
