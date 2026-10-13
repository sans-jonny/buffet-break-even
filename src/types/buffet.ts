export type DiningLevel = '牛牛' | '大牛' | '一绪' | '餐券好价'

export interface Product {
  id: string
  name: string
  category: string
  level: DiningLevel
  price: number
  emoji: string
  gradient: string
}

export interface ProductLine {
  product: Product
  count: number
}

export interface SavedLine {
  name: string
  count: number
  price: number
}

export interface SavedRound {
  time: string
  value: number
  lines: SavedLine[]
}

export interface ReceiptItem {
  id: string
  restaurant: string
  date: string
  price: number
  value: number
  lines: SavedLine[]
  rounds: SavedRound[]
}

export interface DiningSession {
  active: boolean
  id: string
  ticketPrice: number
  diningMode: string
  restaurant: string
  selected: Record<string, number>
  rounds: SavedRound[]
}
