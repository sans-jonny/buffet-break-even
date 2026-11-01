import {createSSRApp} from 'vue'
import App from './App.vue'
import {DiningClient} from './DiningClient'
import {BuffetNavigation} from './navigation/BuffetNavigation'
import {UniBuffetNavigation} from './navigation/UniBuffetNavigation'

export function createApp() {
    const app = createSSRApp(App)
    app.config.errorHandler = (error, _instance, info) => {
        console.error('应用异常', info, error)
        uni.showToast({
            title: error instanceof Error ? error.message : '操作失败，请重试',
            icon: 'none'
        })
    }
    const client = new DiningClient(import.meta.env.VITE_RELAY_URL || 'http://127.0.0.1:3001', app)
    client.ready.catch(DiningClient.report)
    app.provide(DiningClient.token, client)
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation())
    return {app}
}
