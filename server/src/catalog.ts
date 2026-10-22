import type {Product} from '@buffet/shared'

// 房间只校验菜品存在性与价格，仅保留业务字段（id/name/price）。
// 展示字段（category/level/emoji/gradient）仍由前端 catalog 持有。
export const products: Product[] = [
    {id: 'apple', name: '唯可鲜富士苹果汁', price: 10},
    {id: 'juice', name: '唯可鲜果汁', price: 7.5},
    {id: 'tea', name: '唯可鲜茶饮料', price: 6},
    {id: 'icecream', name: '哈根达斯', price: 6},
    {id: 'beef', name: '牛排肉', price: 8},
    {id: 'chuck', name: '精选牛上脑', price: 8},
    {id: 'lamb', name: '羔羊肉', price: 6},
    {id: 'pork', name: '梅花猪肉', price: 3},
    {id: 'fatbeef', name: '肥牛', price: 8},
    {id: 'snowbeef', name: '雪花牛上脑', price: 8},
    {id: 'shrimp', name: '鲜活大虾', price: 12},
    {id: 'salmon', name: '三文鱼刺身', price: 15},
    {id: 'cola', name: '快乐肥宅水', price: 3},
    {id: 'veg', name: '田园蔬菜拼盘', price: 4},
    {id: 'wagyu', name: '甄选和牛', price: 18},
    {id: 'kingcrab', name: '帝王蟹腿', price: 22},
    {id: 'dumpling', name: '手工虾滑', price: 6}
]
