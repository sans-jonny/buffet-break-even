export namespace PageAmount {
    /** Decode decimal text into minor units; Request owns amount limits. */
    export function minor(input: string): number {
        const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
        if (!match) throw new Error('请输入最多两位小数的金额');
        const minor = Number(match[2]) * 100 + Number((match[3] || '').padEnd(2, '0'));
        return match[1] === '-' ? -minor : minor;
    }
}
