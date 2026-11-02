/** Restaurant-specific sample dishes; IDs remain stable for existing consumption and media references. */
export namespace ReferenceDiningVariants {
    type Dish = readonly [id: string, name: string, priceMinor: number];
    const menus: Readonly<Record<string, readonly Dish[]>> = {
        daniu: [
            ['beef', '谷饲牛肩片', 1200], ['shrimp', '去壳青虾仁', 1600], ['wagyu', '雪花牛腹肉', 2800],
            ['vegetables', '京水菜', 800], ['tofu', '日式绢豆腐', 800], ['mushrooms', '白玉菇', 1000],
            ['rice', '牛肉盖饭', 1800], ['udon', '稻庭冷乌冬', 1200], ['soba', '山药荞麦面', 1200],
            ['dessert', '北海道牛乳冰淇淋', 1600], ['pudding', '鸡蛋布丁', 1000], ['mochi', '草莓大福', 1000],
            ['salmon', '炙烤三文鱼', 3000], ['tuna-sushi', '金枪鱼军舰寿司', 1800], ['eel-sushi', '炙烤鳗鱼握寿司', 2000],
            ['tempura', '大虾天妇罗', 2000], ['karaage', '鸡皮饺子', 1600], ['croquette', '蟹肉可乐饼', 1200],
            ['oolong', '玄米茶', 800], ['orange-juice', '西柚汁', 1200], ['plum-juice', '柚子蜜饮', 1000],
            ['watermelon', '鲜切橙子', 800], ['melon', '蜜瓜球', 1200], ['grapes', '蓝莓', 1600], ['strawberries', '红心火龙果', 1200]
        ],
        yixu: [
            ['beef', '安格斯牛板腱', 1600], ['shrimp', '黑虎虾', 2400], ['wagyu', '和牛肋条', 3200],
            ['vegetables', '豌豆苗', 1000], ['tofu', '芝麻豆腐', 1000], ['mushrooms', '舞茸', 1400],
            ['rice', '照烧鸡肉饭', 1800], ['udon', '咖喱乌冬面', 1400], ['soba', '茶荞麦冷面', 1200],
            ['dessert', '黑芝麻冰淇淋', 1600], ['pudding', '焦糖海盐布丁', 1400], ['mochi', '芒果雪媚娘', 1200],
            ['salmon', '厚切三文鱼刺身', 3200], ['tuna-sushi', '甜虾握寿司', 2200], ['eel-sushi', '蟹柳加州卷', 1800],
            ['tempura', '舞茸天妇罗', 1600], ['karaage', '南蛮炸鸡', 1800], ['croquette', '芝士薯饼', 1000],
            ['oolong', '煎茶', 800], ['orange-juice', '苹果汁', 1000], ['plum-juice', '梅子苏打', 1200],
            ['watermelon', '鲜切猕猴桃', 1200], ['melon', '黄桃', 1000], ['grapes', '荔枝', 1400], ['strawberries', '白草莓', 1800]
        ],
        flame: [
            ['short-rib', '黑椒牛肋条', 3000], ['beef-tongue', '厚切盐葱牛舌', 3200], ['skirt-steak', '蒜香牛腹心', 2800],
            ['pork-belly', '韩式辣酱五花', 1800], ['pork-neck', '味噌猪颈肉', 2000], ['sausage', '墨鱼肠', 1400],
            ['chicken-thigh', '柚香鸡腿排', 1800], ['chicken-wing', '蜜汁鸡翅根', 1600], ['chicken-cartilage', '七味鸡膝软骨', 1400],
            ['prawns', '黄油开背虾', 2400], ['scallops', '芝士焗扇贝', 2400], ['squid', '辣酱鱿鱼圈', 2000],
            ['lettuce', '芝麻菜沙拉', 1000], ['king-mushroom', '黄油口蘑', 1200], ['corn', '芝士玉米粒', 1000],
            ['bibimbap', '泡菜牛肉炒饭', 2200], ['cold-noodles', '朝鲜荞麦冷面', 1800], ['kimchi', '凉拌海带芽', 800],
            ['yogurt', '黄桃酸奶杯', 1200], ['lemon-tea', '青柠苏打', 1200], ['ice-cream', '巧克力冰淇淋', 1400]
        ],
        'garden-pot': [
            ['fatty-beef', '雪花牛小排片', 2800], ['lamb', '羔羊后腿肉', 2600], ['beef-slices', '匙柄鲜牛肉', 3000],
            ['tripe', '鲜黄喉', 2400], ['duck-intestine', '去骨鸭掌', 2200], ['duck-blood', '午餐肉', 1200],
            ['shrimp-paste', '鲜虾滑酿竹荪', 2600], ['fish', '鲈鱼片', 2200], ['prawns', '罗氏虾', 2600],
            ['beef-balls', '手打牛筋丸', 1800], ['fish-balls', '福州包心鱼丸', 1600], ['fish-tofu', '芝士鱼豆腐', 1400],
            ['lettuce', '茼蒿苗', 800], ['potato', '山药片', 1000], ['lotus-root', '甜玉米段', 800],
            ['frozen-tofu', '千页豆腐', 1000], ['tofu-skin', '响铃卷', 1200], ['enoki', '蟹味菇拼盘', 1200],
            ['wide-noodles', '红薯粉条', 800], ['noodles', '竹升面', 1000], ['rice-cake', '桂花年糕', 1400],
            ['plum-juice', '雪梨银耳羹', 1200], ['soy-milk', '椰汁', 1000], ['fruit-plate', '杨枝甘露', 1600]
        ],
        cheese: [
            ['margherita', '布拉塔芝士披萨', 3800], ['pepperoni', '双倍芝士腊肠披萨', 3600], ['hawaiian', '凤梨培根披萨', 3400],
            ['durian', '榴莲马斯卡彭披萨', 4200], ['seafood-pizza', '蒜香虾仁披萨', 3800], ['four-cheese', '蓝纹芝士核桃披萨', 4000],
            ['bolognese', '番茄肉丸通心粉', 2600], ['carbonara', '松露蘑菇奶油面', 3000], ['risotto', '南瓜芝士烩饭', 2800],
            ['caesar', '布拉塔番茄沙拉', 2400], ['pumpkin', '芝士焗西兰花', 1600], ['garden-salad', '意式冷面沙拉', 2000],
            ['wings', '帕尔马干酪鸡翅', 2200], ['fries', '松露芝士薯条', 1800], ['garlic-bread', '香草佛卡夏', 1600],
            ['tiramisu', '咖啡千层蛋糕', 2000], ['cheesecake', '巴斯克芝士蛋糕', 2200], ['sparkling-water', '青苹果气泡饮', 1200]
        ]
    };

    export function product(restaurantId: string, id: string, name: string, priceMinor: number) {
        const variant = menus[restaurantId]?.find(dish => dish[0] === id);
        return {id, name: variant?.[1] ?? name, priceMinor: variant?.[2] ?? priceMinor};
    }
}
