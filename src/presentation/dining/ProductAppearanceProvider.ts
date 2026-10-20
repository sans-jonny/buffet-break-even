import type {ProductView} from './ProductView'

/** 根据菜品 ID 提供展示外观，不参与目录查询或计价。 */
export interface ProductAppearanceProvider {
    (id: string): Pick<ProductView, 'emoji' | 'gradient'>
}
