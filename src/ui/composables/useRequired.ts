import {inject} from 'vue'

export function useRequired<T>(token: symbol): T {
    const service = inject<T>(token)
    if (!service) throw new Error(`${String(token)} 未注册`)
    return service
}
