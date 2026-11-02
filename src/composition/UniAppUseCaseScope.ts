import type {App} from 'vue';
import type {InjectionToken} from '../kernel/application/InjectionToken';

/** Typed per-scope container. Only the UI root publishes resolved services to Vue. */
export class UniAppUseCaseScope {
    private readonly instances = new Map<symbol, unknown>();
    private readonly factories = new Map<symbol, () => unknown>();
    private readonly resolving = new Set<symbol>();

    constructor(private readonly app?: App) {}

    provide<T>(token: InjectionToken<T>, implementation: NoInfer<T>): void {
        this.factories.delete(token);
        this.instances.set(token, implementation);
        this.app?.provide(token, implementation);
    }

    factory<T>(token: InjectionToken<T>, create: () => NoInfer<T>): void {
        this.instances.delete(token);
        this.factories.set(token, create);
    }

    resolve<T>(token: InjectionToken<T>): T {
        if (this.instances.has(token)) return this.instances.get(token) as T;
        const create = this.factories.get(token);
        if (!create) throw new Error(`UseCase 未注册：${String(token)}`);
        if (this.resolving.has(token)) throw new Error(`循环依赖：${String(token)}`);
        this.resolving.add(token);
        try {
            const implementation = create() as T;
            this.instances.set(token, implementation);
            this.app?.provide(token, implementation);
            return implementation;
        } finally {
            this.resolving.delete(token);
        }
    }
}
