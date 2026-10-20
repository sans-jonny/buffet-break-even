import {products} from '@/data/catalog'
import type {ProductAppearanceProvider} from './ProductAppearanceProvider'

export const productAppearance: ProductAppearanceProvider = id => {
    const product = products.find(product => product.id === id)
    return {emoji: product?.emoji ?? '🍽️', gradient: product?.gradient ?? 'linear-gradient(145deg,#fff0d5,#ffdfbd)'}
}
