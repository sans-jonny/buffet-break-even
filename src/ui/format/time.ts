export namespace time {
    const pad = (value: number) => String(value).padStart(2, '0')

    function isoDate(value: string): Date | null {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? null : date
    }

    export function formatDateTime(value: string): string {
        const date = isoDate(value)
        if (!date) return ''
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    export function formatRoundTime(value: string): string {
        const date = isoDate(value)
        if (!date) return ''
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    /** Format the current ISO timestamp contract to seconds. */
    export function formatReceiptTimestamp(value: string): string {
        const date = isoDate(value)
        return date ? `${formatDateTime(value)}:${pad(date.getSeconds())}` : ''
    }

}
