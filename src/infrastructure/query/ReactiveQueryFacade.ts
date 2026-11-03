import {QueryClient, QueryObserver, type QueryObserverResult} from '@tanstack/query-core';
import {effectScope, getCurrentScope, onScopeDispose, readonly, shallowRef, watch, type EffectScope, type Ref} from 'vue';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import type {QueryToken} from './QueryToken';
import {QueryRegistry} from './QueryRegistry';

export class ReactiveQueryFacade {
    static readonly token = Symbol('ReactiveQueryFacade') as InjectionToken<ReactiveQueryFacade>;
    private readonly bindings = new Set<ReactiveQueryFacade.Binding<unknown>>();
    private readonly scopes = new WeakMap<EffectScope, Set<ReactiveQueryFacade.Binding<unknown>>>();
    private disposed = false;
    constructor(readonly client: QueryClient, private readonly registry: QueryRegistry) {}

    bind<P, S>(token: QueryToken<P, S>, paramsSource: () => P | undefined): ReactiveQueryFacade.Binding<S> {
        if (this.disposed) throw new Error('ReactiveQueryFacade 已销毁');
        const definition = this.registry.get(token);
        const data = shallowRef<S>(), status = shallowRef<'pending' | 'error' | 'success'>('pending');
        const isFetching = shallowRef(false), error = shallowRef<unknown>(null);
        const owner = getCurrentScope(), scope = effectScope(true);
        let observer: QueryObserver<S> | undefined, unsubscribe: (() => void) | undefined;
        let disposed = false, paused = false, generation = 0;
        const publish = (result: QueryObserverResult<S>) => {
            data.value = result.data; status.value = result.status;
            isFetching.value = result.isFetching; error.value = result.error;
        };
        const subscribe = () => {
            if (!observer || paused || disposed) return;
            unsubscribe = observer.subscribe(publish);
            publish(observer.getCurrentResult());
        };
        scope.run(() => watch(paramsSource, params => {
            generation++;
            unsubscribe?.(); unsubscribe = undefined; observer?.destroy(); observer = undefined;
            data.value = undefined; error.value = null; status.value = 'pending'; isFetching.value = false;
            if (params === undefined) return;
            try {
                // Query functions retain their own immutable request, never a live page ref.
                const snapshot = JSON.parse(JSON.stringify(params)) as P;
                const request = definition.request(snapshot);
                const key = definition.key(snapshot);
                const cached = this.client.getQueryState(key);
                let initialFailure: {error: unknown} | undefined;
                if (!paused && definition.synchronous && (!cached || (cached.isInvalidated && cached.fetchStatus === 'idle'))) {
                    try { this.client.setQueryData(key, definition.execute(request) as S); }
                    catch (failure) { initialFailure = {error: failure}; }
                }
                observer = new QueryObserver<S>(this.client, {
                    queryKey: key, queryFn: () => {
                        if (initialFailure) { const failure = initialFailure.error; initialFailure = undefined; throw failure; }
                        return definition.execute(definition.request(snapshot));
                    }
                });
                subscribe();
            } catch (failure) { error.value = failure; status.value = 'error'; }
        }, {immediate: true, deep: true, flush: 'sync'}));
        const binding: ReactiveQueryFacade.Binding<S> = {
            data: readonly(data) as Readonly<Ref<S | undefined>>, status: readonly(status),
            isFetching: readonly(isFetching), error: readonly(error),
            refresh: async () => {
                if (!observer || disposed) return;
                observer.setOptions(observer.options);
                const current = generation, result = await observer.refetch();
                if (current === generation && !disposed && !paused) publish(result);
            },
            pause: () => { paused = true; unsubscribe?.(); unsubscribe = undefined; isFetching.value = false; },
            resume: () => {
                if (!paused || disposed) return;
                paused = false;
                // A hidden page can outlive the inactive cache entry's gcTime.
                observer?.setOptions(observer.options);
                subscribe();
            },
            dispose: () => {
                if (disposed) return;
                disposed = true; generation++; unsubscribe?.(); observer?.destroy(); scope.stop();
                this.bindings.delete(binding as ReactiveQueryFacade.Binding<unknown>);
                if (owner) this.scopes.get(owner)?.delete(binding as ReactiveQueryFacade.Binding<unknown>);
            }
        };
        this.bindings.add(binding as ReactiveQueryFacade.Binding<unknown>);
        if (owner) {
            let bindings = this.scopes.get(owner);
            if (!bindings) this.scopes.set(owner, bindings = new Set());
            bindings.add(binding as ReactiveQueryFacade.Binding<unknown>);
            onScopeDispose(binding.dispose);
        }
        return binding;
    }

    suspend(owner: EffectScope): void { this.scopes.get(owner)?.forEach(binding => binding.pause()); }
    resume(owner: EffectScope): void { this.scopes.get(owner)?.forEach(binding => binding.resume()); }
    disposeScope(owner: EffectScope): void {
        [...(this.scopes.get(owner) || [])].forEach(binding => binding.dispose());
        this.scopes.delete(owner);
    }
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        [...this.bindings].forEach(binding => binding.dispose()); this.client.clear();
    }
}

export namespace ReactiveQueryFacade {
    export type Binding<S> = {
        readonly data: Readonly<Ref<S | undefined>>;
        readonly status: Readonly<Ref<'pending' | 'error' | 'success'>>;
        readonly isFetching: Readonly<Ref<boolean>>;
        readonly error: Readonly<Ref<unknown>>;
        refresh(): Promise<void>;
        pause(): void;
        resume(): void;
        dispose(): void;
    };
}
