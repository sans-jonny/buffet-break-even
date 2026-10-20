import {computed} from 'vue'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'

export function useApplicationView() {
    const store = useApplicationStore()
    const view = computed(() => store.view)
    return {view, ready: computed(() => view.value.status === 'ready')}
}
