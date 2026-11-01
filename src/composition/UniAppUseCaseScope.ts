import {type App, inject} from 'vue';

/** Uses UniApp/Vue's provide/inject container, with no global asynchronous transaction variable. */
export class UniAppUseCaseScope {
    constructor(private readonly app: App) {
    }

    provide<T>(token: symbol, implementation: T): void {
        this.app.provide(token, implementation);
    }

    resolve<T>(token: symbol): T {
        const implementation = this.app.runWithContext(() => inject<T>(token));
        if (!implementation)
            throw new Error(`UseCase 未注册：${String(token)}`);
        return implementation;
    }
}
