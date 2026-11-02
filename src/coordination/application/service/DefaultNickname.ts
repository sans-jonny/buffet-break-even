/** New-device display names: 50 adjectives × 50 nouns, with no uniqueness claim. */
export namespace DefaultNickname {
    export const adjectives = [
        '活泼', '勇敢', '温柔', '快乐', '机灵', '开朗', '灵巧', '聪明', '热情', '沉稳',
        '认真', '慷慨', '可爱', '自信', '乐观', '淘气', '好奇', '诚实', '善良', '阳光',
        '悠闲', '闪耀', '清爽', '甜蜜', '暖心', '轻快', '俏皮', '俊朗', '潇洒', '淡定',
        '勤奋', '敏捷', '坚定', '洒脱', '热血', '温暖', '圆润', '威风', '迷你', '元气',
        '幸运', '优雅', '自在', '灿烂', '俐落', '灵动', '欢快', '朴实', '浪漫', '萌趣'
    ] as const;
    export const nouns = [
        '熊猫', '海豚', '松鼠', '企鹅', '柴犬', '橘猫', '白兔', '考拉', '水獭', '小鹿',
        '狐狸', '小熊', '鲸鱼', '蝴蝶', '蜜蜂', '海獭', '树懒', '仓鼠', '孔雀', '白鹭',
        '苹果', '芒果', '草莓', '葡萄', '樱桃', '柚子', '桃子', '西瓜', '柠檬', '蜜桃',
        '饭团', '汤圆', '布丁', '奶酪', '麻薯', '年糕', '饺子', '豆包', '馒头', '曲奇',
        '云朵', '星星', '月亮', '微风', '彩虹', '雪花', '山竹', '竹笋', '栗子', '椰子'
    ] as const;

    export function generate(random: () => number = Math.random): string {
        return adjectives[Math.floor(random() * adjectives.length)] + '的' + nouns[Math.floor(random() * nouns.length)];
    }
}
