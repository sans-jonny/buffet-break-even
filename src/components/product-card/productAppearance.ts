import {products} from '@/data/catalog'

export function productAppearance(id: string) {
    const product = products.find(product => product.id === id)
    return {emoji: product?.emoji ?? '🍽️', gradient: product?.gradient ?? 'linear-gradient(145deg,#fff0d5,#ffdfbd)'}
}
