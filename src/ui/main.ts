import {createSSRApp} from 'vue'
import App from './App.vue'
import {Bootstrap} from '../composition/Bootstrap'
import {BuffetNavigation} from './navigation/BuffetNavigation'
import {UniBuffetNavigation} from './navigation/UniBuffetNavigation'
import {PageFeedback} from './presentation/PageFeedback'

export function createApp() {
    const app = createSSRApp(App)
    app.config.errorHandler = (error, _instance, info) => {
        console.error('应用异常', info, error)
        PageFeedback.report(error)
    }
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation())
    const startup = Bootstrap.start(app, () => Bootstrap.device(import.meta.env.VITE_RELAY_URL || 'http://127.0.0.1:3001', Bootstrap.id, PageFeedback.report, app))
    startup.catch(PageFeedback.report)
    return {app, startup}
}
