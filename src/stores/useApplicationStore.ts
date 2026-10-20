import {defineStore} from 'pinia'
import {readonly, shallowRef} from 'vue'
import type {InitializationView} from '@/presentation/shared/InitializationView'

export const useApplicationStore = defineStore('application-view', () => {
    const snapshot = shallowRef<InitializationView>({status: 'idle', message: ''})
    function present(view: InitializationView): void {
        snapshot.value = view
    }
    return {view: readonly(snapshot), present}
})
