import type { DiningLevel, DiningSession, Product, ProductLine, ReceiptItem, SavedLine, SavedRound } from '@/types/buffet'

export function createSession(): DiningSession {
  return {
    active: false,
    id: '',
    ticketPrice: 200,
    diningMode: '单人',
    restaurant: '牛牛',
    selected: {},
    rounds: []
  }
}

export function createDiningSession(ticketPrice: number, diningMode: string, id: string): DiningSession {
  return { ...createSession(), active: true, id, ticketPrice, diningMode }
}

export function changeSelection(selected: DiningSession['selected'], productId: string, change: 1 | -1) {
  const next = { ...selected }
  const count = (next[productId] || 0) + change
  if (count <= 0) delete next[productId]
  else next[productId] = count
  return next
}

export function getSelectedLines(catalog: readonly Product[], selected: DiningSession['selected']): ProductLine[] {
  return catalog
    .filter((product) => selected[product.id])
    .map((product) => ({ product, count: selected[product.id] }))
}

export function getRoundValue(lines: readonly ProductLine[]) {
  return lines.reduce((sum, line) => sum + line.product.price * line.count, 0)
}

export function getSelectedCount(lines: readonly ProductLine[]) {
  return lines.reduce((sum, line) => sum + line.count, 0)
}

export function getCommittedValue(rounds: readonly SavedRound[]) {
  return rounds.reduce((sum, round) => sum + round.value, 0)
}

export function aggregateLines(rounds: readonly SavedRound[], pendingLines: readonly ProductLine[] = []): SavedLine[] {
  const lines = new Map<string, SavedLine>()
  const addLine = (line: SavedLine) => {
    const current = lines.get(line.name)
    if (current) current.count += line.count
    else lines.set(line.name, { ...line })
  }
  rounds.forEach((round) => round.lines.forEach(addLine))
  pendingLines.forEach(({ product, count }) => addLine({ name: product.name, count, price: product.price }))
  return Array.from(lines.values())
}

export function buildRound(lines: readonly ProductLine[], time: string): SavedRound {
  return {
    time,
    value: getRoundValue(lines),
    lines: lines.map(({ product, count }) => ({ name: product.name, count, price: product.price }))
  }
}

export function commitSessionRound(session: DiningSession, catalog: readonly Product[], time: string): DiningSession {
  const lines = getSelectedLines(catalog, session.selected)
  if (!lines.length) return session
  return { ...session, selected: {}, rounds: [...session.rounds, buildRound(lines, time)] }
}

/** 传入待选菜品即可生成预览；正式保存前应先提交待选轮次。 */
export function buildReceipt(session: DiningSession, date: string, pendingLines: readonly ProductLine[] = []): ReceiptItem {
  return {
    id: session.id,
    restaurant: session.restaurant,
    date,
    price: session.ticketPrice,
    value: getCommittedValue(session.rounds) + getRoundValue(pendingLines),
    lines: aggregateLines(session.rounds, pendingLines),
    rounds: session.rounds.map((round) => ({ ...round, lines: round.lines.map((line) => ({ ...line })) }))
  }
}

/** 相同用餐 ID 原位更新；新的记录排在最前面。 */
export function upsertReceipt(items: readonly ReceiptItem[], item: ReceiptItem): ReceiptItem[] {
  const existing = items.findIndex((candidate) => candidate.id === item.id)
  if (existing < 0) return [item, ...items]
  return items.map((candidate, index) => index === existing ? item : candidate)
}

export function getRecordStats(records: readonly ReceiptItem[]) {
  return records.reduce((stats, record) => ({
    lifetimeDifference: stats.lifetimeDifference + record.value - record.price,
    totalRoundsSaved: stats.totalRoundsSaved + record.rounds.length,
    totalDishesSaved: stats.totalDishesSaved + record.lines.reduce((sum, line) => sum + line.count, 0)
  }), { lifetimeDifference: 0, totalRoundsSaved: 0, totalDishesSaved: 0 })
}

export function calculateBreakEven(value: number, price: number) {
  return {
    difference: value - price,
    percent: price ? Math.round((value / price) * 100) : 0,
    isBreakEven: value >= price,
    verdict: value >= price ? 'break-even' : value >= price * 0.6 ? 'close' : 'below'
  }
}

export function filterProducts(catalog: readonly Product[], category: string, levels: readonly DiningLevel[] = []) {
  return catalog.filter((product) => {
    const matchesCategory = category === '我的最爱'
      ? ['beef', 'salmon', 'icecream'].includes(product.id)
      : product.category === category
    return matchesCategory && (!levels.length || levels.includes(product.level))
  })
}
