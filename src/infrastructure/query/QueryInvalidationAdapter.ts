import {QueryClient} from '@tanstack/query-core';
import type {Transaction} from '../../kernel/application/Transaction';
import type {Dining} from '../../coordination/application/dto/Dining';

/** Runtime emits only after local publication, including applied remote batches. */
export class QueryInvalidationAdapter {
    constructor(private readonly client: QueryClient) {}
    onInvalidated(event: Transaction.Invalidation): void {
        void this.client.invalidateQueries({predicate: query => this.dependsOn(query.queryKey, event.keys)})
            .catch(error => console.error('查询刷新失败', error));
    }

    private dependsOn(query: readonly unknown[], keys: readonly string[]): boolean {
        // Empty keys retain the explicit full-refresh contract for external callers.
        if (!keys.length) return true;
        return keys.some(key => {
            if (query[0] === 'accounting' && query[1] === 'activities')
                return key.startsWith('accounting/activity/');
            if (query[0] === 'accounting' && query[1] === 'consumption')
                return key === `accounting/consumption/${query[2]}/${query[3]}`;
            if (query[0] === 'catalog')
                return key.startsWith(`catalog/${query[1]}/restaurant/`) || key.startsWith('catalog/local/restaurant/');
            if (query[0] === 'collaboration' && query[1] === 'rooms')
                return key.startsWith('collaboration/room/');
            if (query[0] === 'coordination' && query[1] === 'personal')
                return key.startsWith('personal/');
            if (query[0] === 'coordination' && query[1] === 'result') {
                const session = query[2] as Dining.Session, restaurantId = query[4] as string;
                return key === `accounting/activity/${session.activityId}`
                    || key === `accounting/consumption/${session.activityId}/${restaurantId}`
                    || key === `catalog/${session.roomId || 'local'}/restaurant/${restaurantId}`
                    || key === `catalog/local/restaurant/${restaurantId}`
                    || (!!session.roomId && key === `collaboration/room/${session.roomId}`)
                    || key === 'personal/identity';
            }
            return true; // Unknown query families opt into conservative invalidation.
        });
    }
}
