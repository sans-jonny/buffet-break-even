import type {QueryClient} from '@tanstack/query-core';
import type {Transaction} from '../../kernel/application/Transaction';
import {QueryRegistry} from './QueryRegistry';

/** Events arrive only after committed local projections are visible. */
export class QueryInvalidationAdapter {
    private pending = new Set<string>();
    private all = false;
    private scheduled?: Promise<void>;
    private disposed = false;
    constructor(private readonly client: QueryClient, private readonly registry: QueryRegistry) {}
    onInvalidated(event: Transaction.Invalidation): void {
        if (this.disposed) return;
        if (!event.keys.length) this.all = true;
        event.keys.forEach(key => this.pending.add(key));
        this.scheduled ||= Promise.resolve().then(async () => {
            const keys = this.all ? [] : [...this.pending];
            this.pending.clear(); this.all = false; this.scheduled = undefined;
            if (!this.disposed) await this.client.invalidateQueries({predicate: query =>
                this.registry.affected(query.queryKey, {type: 'DataInvalidationEvent', keys})});
        }).catch(error => console.error('查询刷新失败', error));
    }
    async settled(): Promise<void> {
        await this.scheduled;
        await Promise.all(this.client.getQueryCache().getAll().map(query => query.promise?.catch(() => undefined)));
    }
    dispose(): void { this.disposed = true; this.pending.clear(); }
}
