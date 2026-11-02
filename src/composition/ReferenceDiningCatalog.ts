import {ReferenceDiningAdditions} from './ReferenceDiningAdditions';
import {ReferenceDiningVariants} from './ReferenceDiningVariants';
import type {Dining} from '../coordination/application/dto/Dining';

/** Bundled sample menus; prices are reference estimates, not official prices. */
export namespace ReferenceDiningCatalog {
    type Menu = [id: string, name: string, products: [id: string, name: string, priceMinor: number][]][];

    function create(categoryId: string, categoryName: string, names: [string, string][], menu: Menu): Dining.Restaurant[] {
        return names.map(([restaurantId, name], restaurantIndex) => ({
            id: restaurantId, name, type: 'PUBLIC', version: 1, deleted: false,
            restaurantCategory: {id: categoryId, name: categoryName},
            categories: menu.map(([id, name]) => ({id, name})),
            products: [...menu.flatMap(([categoryId, , products]) => products.map(([id, name, priceMinor]) => ({
                ...ReferenceDiningVariants.product(restaurantId, id, name, priceMinor), categoryId
            }))), ...ReferenceDiningAdditions.products(categoryId, restaurantIndex, names.length)]
        }));
    }

    export function restaurants(): Dining.Restaurant[] {
        return [
            ...create('sukiyaki', '寿喜烧', [['niuniu', '牛牛'], ['daniu', '大牛'], ['yixu', '一绪']], [
                ['meat', '肉类海鲜', [['beef', '牛上脑', 1000], ['shrimp', '鲜虾', 1800], ['wagyu', '和牛肩胛肉', 2600]]],
                ['vegetables', '蔬菜豆制品', [['vegetables', '时蔬拼盘', 1200], ['tofu', '嫩豆腐', 600], ['mushrooms', '菌菇拼盘', 1000]]],
                ['staples', '主食小食', [['rice', '日式拌饭', 1600], ['udon', '乌冬面', 900], ['soba', '荞麦面', 1000]]],
                ['dessert', '饮品甜点', [['dessert', '冰淇淋', 1500], ['pudding', '焦糖布丁', 1200], ['mochi', '抹茶大福', 800]]],
                ['sashimi', '刺身寿司', [['salmon', '三文鱼刺身', 2800], ['tuna-sushi', '金枪鱼寿司', 1600], ['eel-sushi', '鳗鱼寿司', 1800]]],
                ['snacks', '炸物小食', [['tempura', '天妇罗拼盘', 1800], ['karaage', '日式炸鸡', 1600], ['croquette', '可乐饼', 800]]],
                ['drinks', '茶饮果汁', [['oolong', '乌龙茶', 600], ['orange-juice', '橙汁', 1000], ['plum-juice', '酸梅汤', 800]]],
                ['fruit', '时令水果', [['watermelon', '西瓜', 800], ['melon', '哈密瓜', 1000], ['grapes', '葡萄', 1200], ['strawberries', '草莓', 1400]]]
            ]),
            ...create('barbecue', '烤肉', [['charcoal', '炭火小馆'], ['flame', '火焰烤肉']], [
                ['beef', '牛肉', [['short-rib', '厚切牛小排', 3200], ['beef-tongue', '薄切牛舌', 2800], ['skirt-steak', '横膈膜', 2400]]],
                ['pork', '猪肉', [['pork-belly', '五花肉', 1600], ['pork-neck', '松板肉', 1800], ['sausage', '烤肉肠', 1000]]],
                ['poultry', '鸡肉', [['chicken-thigh', '照烧鸡腿肉', 1400], ['chicken-wing', '鸡中翅', 1600], ['chicken-cartilage', '鸡软骨', 1200]]],
                ['seafood', '海鲜', [['prawns', '盐烤大虾', 2200], ['scallops', '蒜蓉扇贝', 2000], ['squid', '鲜鱿鱼', 1800]]],
                ['vegetables', '烤蔬菜', [['lettuce', '生菜', 600], ['king-mushroom', '杏鲍菇', 800], ['corn', '甜玉米', 600]]],
                ['staples', '主食凉菜', [['bibimbap', '石锅拌饭', 2000], ['cold-noodles', '韩式冷面', 1600], ['kimchi', '泡菜拼盘', 800]]],
                ['dessert', '饮品甜点', [['yogurt', '酸奶', 800], ['lemon-tea', '柠檬茶', 1000], ['ice-cream', '香草冰淇淋', 1200]]]
            ]),
            ...create('hotpot', '火锅', [['spicy-pot', '川味沸腾'], ['garden-pot', '鲜汤花园']], [
                ['beef-lamb', '牛羊肉', [['fatty-beef', '肥牛卷', 2200], ['lamb', '羊肉卷', 2400], ['beef-slices', '鲜切牛肉', 2800]]],
                ['specials', '特色涮品', [['tripe', '鲜毛肚', 2200], ['duck-intestine', '鸭肠', 1800], ['duck-blood', '鸭血', 800]]],
                ['seafood', '海鲜河鲜', [['shrimp-paste', '手打虾滑', 2200], ['fish', '黑鱼片', 1800], ['prawns', '白虾', 2000]]],
                ['meatballs', '丸滑拼盘', [['beef-balls', '牛肉丸', 1600], ['fish-balls', '鱼丸', 1200], ['fish-tofu', '鱼豆腐', 1000]]],
                ['vegetables', '新鲜蔬菜', [['lettuce', '油麦菜', 600], ['potato', '土豆片', 600], ['lotus-root', '莲藕片', 800]]],
                ['tofu-mushrooms', '豆制品菌菇', [['frozen-tofu', '冻豆腐', 600], ['tofu-skin', '豆皮', 800], ['enoki', '金针菇', 800]]],
                ['staples', '主食小吃', [['wide-noodles', '宽粉', 800], ['noodles', '手工面', 800], ['rice-cake', '红糖糍粑', 1200]]],
                ['drinks', '饮品水果', [['plum-juice', '酸梅汤', 800], ['soy-milk', '豆奶', 600], ['fruit-plate', '水果拼盘', 1200]]]
            ]),
            ...create('pizza', '披萨', [['oven', '窑炉披萨'], ['cheese', '芝士工坊']], [
                ['classic', '经典披萨', [['margherita', '玛格丽特披萨', 2800], ['pepperoni', '意式香肠披萨', 3200], ['hawaiian', '夏威夷披萨', 3000]]],
                ['special', '特色披萨', [['durian', '榴莲芝士披萨', 3800], ['seafood-pizza', '海鲜披萨', 3600], ['four-cheese', '四重芝士披萨', 3400]]],
                ['pasta', '意面烩饭', [['bolognese', '肉酱意面', 2200], ['carbonara', '奶油培根意面', 2400], ['risotto', '菌菇烩饭', 2600]]],
                ['salad', '沙拉蔬菜', [['caesar', '凯撒沙拉', 1800], ['pumpkin', '烤南瓜', 1000], ['garden-salad', '田园沙拉', 1600]]],
                ['snacks', '烤物小食', [['wings', '香烤鸡翅', 1800], ['fries', '薯条', 1000], ['garlic-bread', '蒜香面包', 1200]]],
                ['dessert', '甜品饮料', [['tiramisu', '提拉米苏', 1800], ['cheesecake', '芝士蛋糕', 1600], ['sparkling-water', '气泡水', 800]]]
            ])
        ];
    }
}
