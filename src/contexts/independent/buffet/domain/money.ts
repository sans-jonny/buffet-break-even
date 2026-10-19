export function cents(value: number): number {
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) {
        throw new Error('金额必须是有效的非负数')
    }
    return Math.round((value + Number.EPSILON) * 100)
}

export function sumMoney(values: readonly number[]): number {
    const total = values.reduce((sum, value) => sum + cents(value), 0)
    if (!Number.isSafeInteger(total)) throw new Error('金额超出支持范围')
    return total / 100
}
