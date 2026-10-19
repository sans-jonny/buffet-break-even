export const pad = (value: number) => String(value).padStart(2, '0')

export function formatPrice(value: number) {
    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

export function currentTime(withSeconds = false) {
    const date = new Date()
    const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`
    return withSeconds ? `${base}:${pad(date.getSeconds())}` : base
}

export function currentDate() {
    const date = new Date()
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function shortDate() {
    const date = new Date()
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${String(date.getFullYear()).slice(-2)}`
}
