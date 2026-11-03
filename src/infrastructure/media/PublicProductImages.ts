/** Presentation-only sample covers. Domain products never contain URLs or emoji. */
export namespace PublicProductImages {
    const restaurants = new Set(['niuniu', 'daniu', 'yixu', 'charcoal', 'flame', 'spicy-pot', 'garden-pot', 'oven', 'cheese']);
    export const emojiOnly: Readonly<Record<string, string>> = Object.freeze({
        'niuniu/tofu': '🧊',
        'niuniu/oolong': '🍵',
        'daniu/udon': '🍜',
        'yixu/soba': '🍜',
        'charcoal/sausage': '🌭',
        'flame/chicken-cartilage': '🍗',
        'spicy-pot/duck-blood': '🍲',
        'garden-pot/fish-tofu': '🍢',
        'oven/sparkling-water': '🥤',
        'cheese/garlic-bread': '🥖'
    });
    // Each image is assigned to exactly one (restaurant, product) pair, including same-name dishes.
    const covers: Readonly<Record<string, string>> = {
        'niuniu/beef': 'steak.jpg',
        'oven/margherita': 'pizza.jpg',
        'cheese/caesar': 'salad.jpg',
        'spicy-pot/potato': 'picsum-food.jpg',
        'yixu/strawberries': 'picsum-strawberries.jpg',
        'niuniu/salmon': 'sushi-salmon.jpg',
        'daniu/eel-sushi': 'sushi-assorted.jpg',
        'daniu/tuna-sushi': 'sushi-rolls.jpg',
        'daniu/suki-avocado-sushi': 'sushi-tempura.jpg',
        'yixu/salmon': 'sashimi-ice.jpg',
        'spicy-pot/fish': 'grilled-fish.jpg',
        'charcoal/bbq-ribeye': 'steak-plated.jpg',
        'flame/bbq-beef-cubes': 'steak-slices.jpg',
        'charcoal/skirt-steak': 'beef-fries.jpg',
        'charcoal/bbq-ribs': 'pork-ribs.jpg',
        'flame/bbq-jowl': 'barbecue-ribs.jpg',
        'charcoal/short-rib': 'grilled-meats.jpg',
        'flame/bbq-spicy-chicken': 'chicken-wedges.jpg',
        'daniu/suki-chuck': 'grilled-steak.jpg',
        'niuniu/suki-spring-roll': 'spring-rolls.jpg',
        'yixu/suki-gyoza': 'fried-dumplings.jpg',
        'niuniu/vegetables': 'salad-bowl.jpg',
        'oven/caesar': 'salad-plated.jpg',
        'cheese/pizza-avocado-salad': 'vegetable-salad.jpg',
        'oven/risotto': 'creamy-risotto.jpg',
        'cheese/carbonara': 'mushroom-pasta.jpg',
        'daniu/tofu': 'tofu-soy.jpg',
        'garden-pot/pot-tofu-puff': 'crispy-tofu.jpg',
        'niuniu/orange-juice': 'orange-juice.jpg',
        'cheese/pizza-mango-juice': 'orange-juice-glass.jpg',
        'yixu/oolong': 'green-tea.jpg',
        'flame/bbq-honey-tea': 'tea-teapot.jpg',
        'oven/fries': 'fries.jpg',
        'oven/pizza-potato-wedges': 'fries-dips.jpg',
        'oven/bolognese': 'pasta-tomato.jpg',
        'oven/pizza-seafood-pasta': 'pasta-fork.jpg',
        'cheese/bolognese': 'penne-tomato.jpg',
        'oven/pizza-mushroom': 'pizza-neapolitan.jpg',
        'cheese/pizza-bbq-chicken': 'pizza-table.jpg',
        'niuniu/suki-pineapple': 'fruit-skewers.jpg',
        'yixu/pudding': 'caramel-pudding.jpg',
        'flame/ice-cream': 'ice-cream.jpg',
        'daniu/dessert': 'ice-cream-bowl.jpg',
        'cheese/garden-salad': 'pasta-salad.jpg',
        'spicy-pot/fruit-plate': 'fruit-salad.jpg'
    };

    export function cover(restaurantId: string, productId: string): string {
        if (!restaurants.has(restaurantId) || emojiOnly[`${restaurantId}/${productId}`]) return '';
        const file = covers[`${restaurantId}/${productId}`];
        if (file) return `/sample-images/${file}?v=100`;
        // One random photo per product seed, stable across renders and page revisits.
        return `https://picsum.photos/seed/${encodeURIComponent(`${restaurantId}-${productId}`)}/100/100`;
    }

    export function emoji(restaurantId: string, productId: string): string {
        return emojiOnly[`${restaurantId}/${productId}`] || '🍽️';
    }
}
