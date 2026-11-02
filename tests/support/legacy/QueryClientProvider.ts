import {computed, shallowRef} from 'vue';
import {DiningQueries} from '../../../src/infrastructure/query/DiningQueries';
import {ReactiveQueryFacade} from '../../../src/infrastructure/query/ReactiveQueryFacade';
import type {QueryToken} from '../../../src/infrastructure/query/QueryToken';
import type {Dining} from '../../../src/coordination/application/dto/Dining';

/** Test scenario vocabulary over the production facade, not an application Store. */
export class QueryClientProvider {
    readonly client;
    private readonly bindings = new Map<string, ReactiveQueryFacade.Binding<any>>();
    private owners = 0;
    private disposed = false;
    private readonly unsubscribe: () => void;
    private readonly epoch = shallowRef(0);
    readonly fetching;
    readonly error;
    constructor(private readonly facade: ReactiveQueryFacade, private readonly flush: () => Promise<void>) {
        this.client = facade.client;
        this.unsubscribe = this.client.getQueryCache().subscribe(() => this.epoch.value++);
        this.fetching = computed(() => { this.epoch.value; return this.client.isFetching() > 0; });
        this.error = computed(() => { this.epoch.value; return this.client.getQueryCache().getAll().find(q => q.state.error)?.state.error ?? null; });
    }
    bind<P, S>(token: QueryToken<P, S>, source: () => P | undefined) { return this.facade.bind(token, source); }
    private read<P, S>(token: QueryToken<P, S>, params: P): S {
        const key = JSON.stringify([token.name, params]);
        let binding = this.bindings.get(key);
        if (this.disposed) return binding?.data.value as S;
        if (!binding || !this.owners) {
            binding?.dispose();
            binding = this.facade.bind(token, () => params);
            this.bindings.set(key, binding);
            if (!this.owners) binding.pause();
        }
        if (binding.error.value) throw binding.error.value;
        return binding.data.value as S;
    }
    activities() { return this.read(DiningQueries.Activities, {}).value; }
    restaurants(scopeId: string) { return this.read(DiningQueries.Restaurants, {scopeId}).value; }
    rooms() { return this.read(DiningQueries.Rooms, {}).value; }
    consumption(activityId: string, restaurantId: string) {
        if (!activityId?.trim() || !restaurantId?.trim()) return undefined;
        return this.read(DiningQueries.Consumption, {activityId, restaurantId}).value;
    }
    personal() { return this.read(DiningQueries.Personal, {}); }
    result(session: Dining.Session, actor: Dining.Identity, restaurantId: string) {
        return this.read(DiningQueries.Result, {session, actor, restaurantId}).value;
    }
    acquire(): () => void {
        this.owners++;
        this.bindings.forEach(b => b.resume());
        let released = false;
        return () => { if (released) return; released = true; if (!--this.owners) this.bindings.forEach(b => b.pause()); };
    }
    async settled() { await this.flush(); }
    refresh() { return this.client.invalidateQueries(); }
    dispose() { this.disposed = true; this.unsubscribe(); this.bindings.forEach(b => b.dispose()); this.bindings.clear(); }
}
