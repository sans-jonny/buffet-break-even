import {computed, ref} from 'vue';

/** Per-owner command progress and errors; never stores a business response. */
export namespace CommandState {
    export function create() {
        const pending = ref(0), error = ref<unknown>(null);
        async function run<T>(work: () => T | Promise<T>): Promise<T> {
            pending.value++; error.value = null;
            try { return await work(); }
            catch (failure) { error.value = failure; throw failure; }
            finally { pending.value--; }
        }
        return {run, clearError: () => { error.value = null; }, loading: computed(() => pending.value > 0), error: computed(() => error.value)};
    }
}
