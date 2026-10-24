/** 缺少种类的旧记录继续显示原餐厅名称。 */
export function formatRestaurantTitle(restaurant?: string, typeName?: string): string {
    return [typeName, restaurant].filter(Boolean).join(' · ')
}
