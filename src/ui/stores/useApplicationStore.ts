import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {InitializationView} from '@/presentation/shared/InitializationView'
import type {ViewStore} from '@/presentation/shared/ViewStore'

export const useApplicationStore = defineStore('application-view', () => {
    const snapshot = shallowRef<InitializationView>({status: 'idle', message: ''})
    function present(view: InitializationView): void {
        snapshot.value = view
    }
    const store = {view: readonly(snapshot), present}
    return store satisfies ViewStore<InitializationView>
})
