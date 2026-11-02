import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {QueryClient, QueryObserver, type QueryKey} from '@tanstack/query-core';
import {shallowRef, readonly, type ShallowRef} from 'vue';
import {ListDiningActivitiesUseCase} from '../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {GetConsumptionUseCase} from '../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {ListRestaurantsUseCase} from '../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {ListRoomsUseCase} from '../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {GetDiningResultUseCase} from '../../coordination/application/port/in/dining/GetDiningResultUseCase';
import {GetPersonalDiningUseCase} from '../../coordination/application/port/in/device/GetPersonalDiningUseCase';
import type {Dining} from '../../coordination/application/dto/Dining';

/** Query functions receive input ports from the same application container as commands. */
export class QueryClientProvider {
    static readonly token = Symbol('QueryClientProvider') as InjectionToken<QueryClientProvider>;
    readonly client: QueryClient;
    readonly fetching = shallowRef(false);
    readonly error = shallowRef<unknown>(null);
    private readonly epoch = shallowRef(0);
    private readonly projections = new Map<string, {
        data: ShallowRef<unknown>; observer: QueryObserver<unknown>; stop?: () => void;
    }>();
    private owners = 0;

    constructor(ports: QueryClientProvider.Ports, private readonly now: () => string, gcTime = 5 * 60 * 1000) {
        // Queries read committed local projections and must work while the device is offline.
        this.client = new QueryClient({defaultOptions: {queries: {staleTime: Infinity, retry: false, gcTime, networkMode: 'always'}}});
        this.client.getQueryCache().subscribe(event => {
            if (event.type === 'removed') this.projections.delete(JSON.stringify(event.query.queryKey));
            this.fetching.value = this.client.isFetching() > 0;
            this.error.value = this.client.getQueryCache().getAll().find(query => query.state.error)?.state.error ?? null;
        });
        const {activities, restaurants, rooms, consumption, result, personal} = ports;
        this.client.setQueryDefaults(['accounting', 'activities'], {queryFn: () => activities.execute(new ListDiningActivitiesUseCase.Request()).value});
        this.client.setQueryDefaults(['catalog'], {queryFn: ({queryKey}) => restaurants.execute(new ListRestaurantsUseCase.Request(queryKey[1] as string, true)).value});
        this.client.setQueryDefaults(['collaboration', 'rooms'], {queryFn: () => rooms.execute(new ListRoomsUseCase.Request()).value});
        this.client.setQueryDefaults(['accounting', 'consumption'], {queryFn: ({queryKey}) =>
            ({value: consumption.execute(new GetConsumptionUseCase.Request(queryKey[2] as string, queryKey[3] as string)).value})});
        this.client.setQueryDefaults(['coordination', 'personal'], {queryFn: () => personal.execute()});
        this.client.setQueryDefaults(['coordination', 'result'], {queryFn: ({queryKey}) => result.execute(
            new GetDiningResultUseCase.Request(queryKey[2] as Dining.Session, queryKey[3] as Dining.Identity, queryKey[4] as string, this.now())).value});
    }

    /** The ref is only an observer projection; QueryClient owns cached DTOs. */
    read<T>(key: QueryKey): T {
        this.epoch.value;
        const hash = JSON.stringify(key);
        let entry = this.projections.get(hash);
        if (!entry) {
            const defaults = this.client.getQueryDefaults(key);
            // All local query ports are synchronous. Initial data avoids a blank first frame.
            const localQuery = defaults.queryFn as (context: {queryKey: QueryKey}) => unknown;
            const initialData = this.client.getQueryData(key) ?? localQuery({queryKey: key});
            const observer = new QueryObserver<unknown>(this.client, {queryKey: key, initialData});
            entry = {data: shallowRef(observer.getCurrentResult().data), observer};
            this.projections.set(hash, entry);
            if (this.owners) this.subscribe(entry);
        }
        return readonly(entry.data).value as T;
    }

    acquire(): () => void {
        if (++this.owners === 1) {
            // Previous pages' computed values re-read through epoch. Only views
            // actually used by the new visible pages create fresh observers.
            this.projections.clear();
            this.epoch.value++;
        }
        let released = false;
        return () => {
            if (released) return;
            released = true;
            if (--this.owners === 0) {
                for (const entry of this.projections.values()) { entry.stop?.(); entry.stop = undefined; }
                this.projections.clear();
            }
        };
    }

    private subscribe(entry: {data: ShallowRef<unknown>; observer: QueryObserver<unknown>; stop?: () => void}): void {
        entry.stop = entry.observer.subscribe(result => { entry.data.value = result.data; });
        entry.data.value = entry.observer.getCurrentResult().data;
    }

    async settled(): Promise<void> {
        await Promise.all(this.client.getQueryCache().getAll().map(query => query.promise?.catch(() => undefined)));
        // Observer notifications are synchronous; failed queries remain visible through status.
    }

    refresh(): Promise<void> { return this.client.invalidateQueries(); }
    dispose(): void {
        for (const entry of this.projections.values()) entry.stop?.();
        this.projections.clear();
        this.client.clear();
    }
}

export namespace QueryClientProvider {
    export type Ports = {
        activities: ListDiningActivitiesUseCase;
        restaurants: ListRestaurantsUseCase;
        rooms: ListRoomsUseCase;
        consumption: GetConsumptionUseCase;
        result: GetDiningResultUseCase;
        personal: GetPersonalDiningUseCase;
    };
}
