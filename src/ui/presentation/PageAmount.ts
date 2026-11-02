export namespace PageAmount {
    export function minor(input: string): number {
        if (!/^\d+(?:\.\d{1,2})?$/.test(input.trim())) throw new Error('请输入最多两位小数的金额')
        const [integer, fraction = ''] = input.trim().split('.')
        const minor = Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
        if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('金额过大')
        return minor
    }
}
