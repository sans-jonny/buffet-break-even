import {computed, ref} from 'vue';
import type {QueryClientProvider} from '../infrastructure/query/QueryClientProvider';

/** Shared command state; query failures remain on QueryClientProvider and never retry writes. */
export namespace CommandState {
    export function create(queries: QueryClientProvider) {
        const pending = ref(0), error = ref<unknown>(null);
        async function run<T>(work: () => Promise<T>): Promise<T> {
            pending.value++;
            error.value = null;
            let release: (() => void) | undefined;
            try {
                release = queries.acquire();
                const response = await work();
                await queries.settled();
                return response;
            } catch (failure) {
                error.value = failure;
                throw failure;
            } finally {
                pending.value--;
                release?.();
            }
        }
        return {run, loading: computed(() => pending.value > 0), error: computed(() => error.value)};
    }
}
