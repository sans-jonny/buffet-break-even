import {defineStore} from 'pinia'
import {computed, readonly, shallowRef} from 'vue'
import type {ApplicationView} from '@/presentation/shared/ApplicationView'

export const useApplicationStore = defineStore('application-view', () => {
    const snapshot = shallowRef<ApplicationView.ViewModel>({status: 'idle', message: ''})
    const view = readonly(snapshot)
    function present(viewModel: ApplicationView.ViewModel): void {
        snapshot.value = viewModel
    }
    const store = {view, ready: computed(() => view.value.status === 'ready'), present}
    return store satisfies ApplicationView
})
