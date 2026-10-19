import type {DiningSession} from '@/contexts/independent/buffet/domain/DiningSession'
import type {ProductLine} from '@/contexts/independent/buffet/domain/ProductLine'
import type {Receipt} from '@/contexts/independent/buffet/domain/Receipt'
import {aggregateLines, getCommittedValue, getRoundValue} from '@/contexts/independent/buffet/domain/rounds'
import {cents, sumMoney} from '@/contexts/independent/buffet/domain/money'

export function buildReceipt(session: DiningSession, date: string, pending: readonly ProductLine[] = []): Receipt {
    return {
        id: session.id, restaurant: session.restaurant, date, price: session.ticketPrice,
        value: sumMoney([getCommittedValue(session.rounds), getRoundValue(pending)]),
        lines: aggregateLines(session.rounds, pending),
        rounds: session.rounds.map(round => ({...round, lines: round.lines.map(line => ({...line}))}))
    }
}

export function upsertReceipt(items: readonly Receipt[], item: Receipt): Receipt[] {
    const copy = {
        ...item,
        lines: item.lines.map(line => ({...line})),
        rounds: item.rounds.map(round => ({...round, lines: round.lines.map(line => ({...line}))}))
    }
    return items.some(candidate => candidate.id === item.id)
        ? items.map(candidate => candidate.id === item.id ? copy : candidate) : [copy, ...items]
}

export function getRecordStats(records: readonly Receipt[]) {
    return {
        lifetimeDifference: records.reduce((sum, record) => sum + cents(record.value) - cents(record.price), 0) / 100,
        totalRoundsSaved: records.reduce((sum, record) => sum + record.rounds.length, 0),
        totalDishesSaved: records.reduce((sum, record) => sum + record.lines.reduce((count, line) => count + line.count, 0), 0)
    }
}
