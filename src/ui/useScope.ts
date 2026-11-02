import {getCurrentScope, inject} from 'vue';
import {onShow, onHide, onUnload} from '@dcloudio/uni-app';
import {UniAppUseCaseScope} from '../composition/UniAppUseCaseScope';
import {ReactiveQueryFacade} from '../infrastructure/query/ReactiveQueryFacade';

export function useScope(): UniAppUseCaseScope {
    const scope = inject<UniAppUseCaseScope>(UniAppUseCaseScope.token);
    if (!scope) throw new Error('UniAppUseCaseScope 未注册');
    const owner = getCurrentScope();
    if (owner && !useScope.owners.has(owner)) {
        useScope.owners.add(owner);
        const queries = scope.resolve(ReactiveQueryFacade.token);
        onHide(() => queries.suspend(owner));
        onShow(() => queries.resume(owner));
        onUnload(() => queries.disposeScope(owner));
    }
    return scope;
}

export namespace useScope {
    export const owners = new WeakSet<import('vue').EffectScope>();
}
