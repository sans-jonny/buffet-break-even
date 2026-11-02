import {inject, getCurrentScope, onScopeDispose, type EffectScope} from 'vue';
import {onShow, onHide} from '@dcloudio/uni-app';
import type {InjectionToken} from '../kernel/application/InjectionToken';
import {QueryClientProvider} from '../infrastructure/query/QueryClientProvider';

/** Each page owns one query subscription lease, regardless of how many stores it uses. */
export namespace BusinessStoreScope {
    const scopes = new WeakSet<EffectScope>();
    export function use<T>(token: InjectionToken<T>): T {
        const store = inject<T>(token);
        if (store === undefined) throw new Error(`Store 未注册：${String(token)}`);
        const scope = getCurrentScope();
        if (scope && !scopes.has(scope)) {
            scopes.add(scope);
            const queries = inject<QueryClientProvider>(QueryClientProvider.token);
            if (!queries) throw new Error('QueryClientProvider 未注册');
            let disposed = false, release: (() => void) | undefined = queries.acquire();
            onScopeDispose(() => { disposed = true; release?.(); release = undefined; });
            onHide(() => { release?.(); release = undefined; });
            onShow(() => {
                if (disposed) return;
                release ||= queries.acquire();
            });
        }
        return store;
    }
}
