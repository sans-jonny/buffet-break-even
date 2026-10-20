import {createSSRApp} from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'
import {registerApplication} from './composition/registerApplication'

export function createApp() {
    const app = createSSRApp(App)
    const pinia = Pinia.createPinia()
    app.use(pinia)
    registerApplication(app, pinia)
    return {app, pinia, Pinia}
}
