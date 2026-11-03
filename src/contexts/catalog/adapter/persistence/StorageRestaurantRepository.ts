import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {RestaurantRepository} from '../../application/port/out/RestaurantRepository';
import {Restaurant} from '../../domain/aggregate/Restaurant';
import {DomainRejection} from '../../../../kernel/domain/DomainRejection';
import {Transaction} from '../../../../kernel/application/Transaction';
import {UseCase} from '../../../../kernel/application/UseCase';
import {RepositoryTransaction} from '../../../../infrastructure/storage/RepositoryTransaction';
import {CatalogEventMapper} from './CatalogEventMapper';

export class StorageRestaurantRepository implements RestaurantRepository {
    constructor(private readonly context: RepositoryTransaction) {
    }

    static project(event: SerializedEvent.Fact, state: Transaction.State): void {
        CatalogEventMapper.apply(event, state);
    }

    findById(scope: string, id: string): Restaurant | undefined {
        const state = this.context.view().get<Restaurant.State>(this.key(scope, id));
        return state ? Restaurant.reconstitute(state) : undefined;
    }

    all(scope: string): readonly Restaurant[] {
        return this.context.view().entries<Restaurant.State>(`catalog/${scope}/restaurant/`).map(s => Restaurant.reconstitute(s));
    }

    async apply(scope: string, decision: Restaurant.Event | DomainRejection): Promise<Restaurant | undefined> {
        const event = UseCase.accept(decision);
        const scopeId = scope === 'local' ? 'local-catalog' : scope;
        const roomId = scope === 'local' ? null : scope;
        return this.context.run(scopeId, roomId, async (tx) => {
            await tx.stage(SerializedEvent.fact(event, this.key(scope, event.aggregateId)));
            const state = tx.get<Restaurant.State>(this.key(scope, event.aggregateId));
            return state ? Restaurant.reconstitute(state) : undefined;
        });
    }

    private key(scope: string, id: string): string {
        return `catalog/${scope}/restaurant/${id}`;
    }
}
