import {type App, inject} from 'vue';
import type {InjectionToken} from '../kernel/application/InjectionToken';

/** Uses UniApp/Vue's provide/inject container, with no global asynchronous transaction variable. */
export class UniAppUseCaseScope {
    constructor(private readonly app: App) {
    }

    provide<T>(token: InjectionToken<T>, implementation: NoInfer<T>): void {
        this.app.provide(token, implementation);
    }

    resolve<T>(token: InjectionToken<T>): T {
        const implementation = this.app.runWithContext(() => inject<T | undefined>(token, undefined));
        if (implementation === undefined)
            throw new Error(`UseCase 未注册：${String(token)}`);
        return implementation;
    }
}
