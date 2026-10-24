const pad = (value: number) => String(value).padStart(2, '0')

function isoDate(value: string): Date | null {
    // Only parse explicit time zones; preserve legacy local display strings.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value: string): string {
    const date = isoDate(value)
    if (!date) return value
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatRoundTime(value: string): string {
    const date = isoDate(value)
    if (!date) return value
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 小票和导出文件名共用同一个原始时间；旧记录缺失秒时补零。 */
export function formatReceiptTimestamp(value: string): string {
    const date = isoDate(value)
    if (date) return `${formatDateTime(value)}:${pad(date.getSeconds())}`
    const local = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?$/.exec(value)
    return local ? `${local[1]} ${local[2] || '00:00'}:${local[3] || '00'}` : value
}
