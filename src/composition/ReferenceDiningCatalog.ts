import type {Dining} from '../coordination/application/dto/Dining';

/** Bundled local reference data, not a remote public catalog. */
export namespace ReferenceDiningCatalog {
    export function restaurants(): Dining.Restaurant[] {
        return [['niuniu', '牛牛'], ['daniu', '大牛'], ['yixu', '一绪']].map(([id, name]) => ({
            id, name, type: 'PUBLIC', version: 1, deleted: false,
            restaurantCategory: {id: 'sukiyaki', name: '寿喜烧'},
            categories: [
                {id: 'meat', name: '肉类海鲜'}, {id: 'vegetables', name: '蔬菜豆制品'},
                {id: 'staples', name: '主食小食'}, {id: 'dessert', name: '饮品甜点'}
            ],
            products: [
                {id: 'beef', categoryId: 'meat', name: '牛上脑', priceMinor: 1000},
                {id: 'shrimp', categoryId: 'meat', name: '鲜虾', priceMinor: 1800},
                {id: 'vegetables', categoryId: 'vegetables', name: '时蔬拼盘', priceMinor: 1200},
                {id: 'rice', categoryId: 'staples', name: '日式拌饭', priceMinor: 1600},
                {id: 'dessert', categoryId: 'dessert', name: '冰淇淋', priceMinor: 1500}
            ]
        }));
    }
}
