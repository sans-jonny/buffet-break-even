/** UUIDv7 的前 48 位保存 Unix 毫秒时间，剩余位提供随机性。 */
export function createUserId(timestamp = Date.now()): string {
    if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp >= 2 ** 48) throw new Error('用户身份时间无效')
    const bytes = new Uint8Array(16)
    if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes)
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
    let time = timestamp
    for (let i = 5; i >= 0; i--) {bytes[i] = time % 256; time = Math.floor(time / 256)}
    bytes[6] = (bytes[6] & 15) | 0x70
    bytes[8] = (bytes[8] & 63) | 0x80
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

export const isUserId = (value: unknown): value is string => typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
