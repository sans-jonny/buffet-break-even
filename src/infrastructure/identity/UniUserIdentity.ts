import {createUserId, isUserId} from '@/utils/user-id'

/** 设备本地用户身份独立于昵称、单人会话和房间恢复凭证。 */
export class UniUserIdentity {
    load(): string {
        const stored = uni.getStorageSync('buffet-user-id-v1')
        if (isUserId(stored)) return stored
        if (stored !== undefined && stored !== null && stored !== '') throw new Error('本地用户身份无效')
        const id = createUserId()
        try {uni.setStorageSync('buffet-user-id-v1', id)} catch {throw new Error('用户身份保存失败，请重试')}
        return id
    }
}
