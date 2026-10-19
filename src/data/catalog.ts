import type {CatalogEntry} from './CatalogEntry'


export const diningLevels: string[] = ['牛牛', '大牛', '一绪', '餐券好价']

export const categories = [
    '夯品推介',
    '自取台',
    '饮料',
    '超值版',
    '海鲜版',
    '进阶版',
    '奢享版',
    '尊享版',
    '大家常点',
    '我的最爱'
]

export const products: CatalogEntry[] = [
    {
        id: 'apple',
        name: '唯可鲜富士苹果汁',
        category: '夯品推介',
        level: '牛牛',
        price: 10,
        emoji: '🍎',
        gradient: 'linear-gradient(145deg,#daf0b9,#f5deb2)'
    },
    {
        id: 'juice',
        name: '唯可鲜果汁',
        category: '夯品推介',
        level: '大牛',
        price: 7.5,
        emoji: '🧃',
        gradient: 'linear-gradient(145deg,#f7d173,#cbe9bd)'
    },
    {
        id: 'tea',
        name: '唯可鲜茶饮料',
        category: '夯品推介',
        level: '一绪',
        price: 6,
        emoji: '🧋',
        gradient: 'linear-gradient(145deg,#f7c57a,#ffeac7)'
    },
    {
        id: 'icecream',
        name: '哈根达斯',
        category: '夯品推介',
        level: '餐券好价',
        price: 6,
        emoji: '🍨',
        gradient: 'linear-gradient(145deg,#f3c9be,#f6e4d9)'
    },
    {
        id: 'beef',
        name: '牛排肉',
        category: '超值版',
        level: '牛牛',
        price: 8,
        emoji: '🥩',
        gradient: 'linear-gradient(145deg,#ff9c71,#d94c44)'
    },
    {
        id: 'chuck',
        name: '精选牛上脑',
        category: '超值版',
        level: '大牛',
        price: 8,
        emoji: '🥩',
        gradient: 'linear-gradient(145deg,#fb805f,#b72f34)'
    },
    {
        id: 'lamb',
        name: '羔羊肉',
        category: '超值版',
        level: '一绪',
        price: 6,
        emoji: '🍖',
        gradient: 'linear-gradient(145deg,#e7a574,#943849)'
    },
    {
        id: 'pork',
        name: '梅花猪肉',
        category: '超值版',
        level: '餐券好价',
        price: 3,
        emoji: '🥓',
        gradient: 'linear-gradient(145deg,#ffd4d0,#e97472)'
    },
    {
        id: 'fatbeef',
        name: '肥牛',
        category: '进阶版',
        level: '牛牛',
        price: 8,
        emoji: '🥩',
        gradient: 'linear-gradient(145deg,#edc281,#cb5d48)'
    },
    {
        id: 'snowbeef',
        name: '雪花牛上脑',
        category: '进阶版',
        level: '大牛',
        price: 8,
        emoji: '🥩',
        gradient: 'linear-gradient(145deg,#ef9980,#b83e4b)'
    },
    {
        id: 'shrimp',
        name: '鲜活大虾',
        category: '海鲜版',
        level: '一绪',
        price: 12,
        emoji: '🦐',
        gradient: 'linear-gradient(145deg,#b8e9e5,#f2996c)'
    },
    {
        id: 'salmon',
        name: '三文鱼刺身',
        category: '海鲜版',
        level: '大牛',
        price: 15,
        emoji: '🍣',
        gradient: 'linear-gradient(145deg,#ffc99a,#f07c62)'
    },
    {
        id: 'cola',
        name: '快乐肥宅水',
        category: '饮料',
        level: '餐券好价',
        price: 3,
        emoji: '🥤',
        gradient: 'linear-gradient(145deg,#eed1a1,#b96754)'
    },
    {
        id: 'veg',
        name: '田园蔬菜拼盘',
        category: '自取台',
        level: '牛牛',
        price: 4,
        emoji: '🥬',
        gradient: 'linear-gradient(145deg,#d9ed9c,#72b77a)'
    },
    {
        id: 'wagyu',
        name: '甄选和牛',
        category: '奢享版',
        level: '一绪',
        price: 18,
        emoji: '🥩',
        gradient: 'linear-gradient(145deg,#f0c7a5,#a23e42)'
    },
    {
        id: 'kingcrab',
        name: '帝王蟹腿',
        category: '尊享版',
        level: '餐券好价',
        price: 22,
        emoji: '🦀',
        gradient: 'linear-gradient(145deg,#f8c18f,#da6a50)'
    },
    {
        id: 'dumpling',
        name: '手工虾滑',
        category: '大家常点',
        level: '大牛',
        price: 6,
        emoji: '🍥',
        gradient: 'linear-gradient(145deg,#f7e7c1,#f1b7aa)'
    }
]


