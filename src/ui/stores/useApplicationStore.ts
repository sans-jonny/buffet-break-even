import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {ApplicationView} from '@/presentation/shared/ApplicationView'

export const useApplicationStore = defineStore('application-view', () => {
    const snapshot = shallowRef<ApplicationView.ViewModel>({status: 'idle', message: ''})
    function present(viewModel: ApplicationView.ViewModel): void {
        snapshot.value = viewModel
    }
    const store = {view: readonly(snapshot), present}
    return store satisfies ApplicationView
})
