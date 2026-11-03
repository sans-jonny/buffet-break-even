export namespace restaurantTitle {
    /** 缺少种类的旧记录继续显示原餐厅名称。 */
    export function formatRestaurantTitle(restaurant?: string, typeName?: string, isMultiplayer = false): string {
        const title = [typeName, restaurant].filter(Boolean).join(' · ')
        return title && isMultiplayer ? title + '（多人）' : title
    }

}
