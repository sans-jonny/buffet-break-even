import {QueryClient} from '@tanstack/query-core';
import type {Transaction} from '../../kernel/application/Transaction';

/** Runtime emits only after local publication, including applied remote batches. */
export class QueryInvalidationAdapter {
    constructor(private readonly client: QueryClient) {}
    onInvalidated(_event: Transaction.Invalidation): void {
        // Cross-context workflows affect totals, menus, rooms and personal results.
        // Invalidate all dependent views until event targets support a narrower mapping.
        void this.client.invalidateQueries().catch(error => console.error('查询刷新失败', error));
    }
}
