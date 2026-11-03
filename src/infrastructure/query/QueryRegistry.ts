import type {QueryKey} from '@tanstack/query-core';
import type {QueryToken} from './QueryToken';
import type {Transaction} from '../../kernel/application/Transaction';
import type {InjectionToken} from '../../kernel/application/InjectionToken';

export class QueryRegistry {
    static readonly token = Symbol('QueryRegistry') as InjectionToken<QueryRegistry>;
    private readonly definitions = new Map<symbol, unknown>();
    private readonly invalidators: QueryRegistry.Definition<never, never, never>['affected'][] = [];

    register<P, R, S>(token: QueryToken<P, S>, definition: QueryRegistry.Definition<P, R, S>): void {
        if (this.definitions.has(token.id)) throw new Error(`查询重复注册：${token.name}`);
        this.definitions.set(token.id, definition);
        this.invalidators.push(definition.affected);
    }

    get<P, S>(token: QueryToken<P, S>): QueryRegistry.Definition<P, unknown, S> {
        const definition = this.definitions.get(token.id);
        if (!definition) throw new Error(`查询未注册：${token.name}`);
        return definition as QueryRegistry.Definition<P, unknown, S>;
    }

    affected(key: QueryKey, event: Transaction.Invalidation): boolean {
        return this.invalidators.some(affected => affected(key, event));
    }
}

export namespace QueryRegistry {
    export type Definition<P, R, S> = {
        synchronous?: boolean;
        key(params: P): QueryKey;
        request(params: P): R;
        execute(request: R): S | Promise<S>;
        affected(key: QueryKey, event: Transaction.Invalidation): boolean;
    };
}
