import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {RestaurantConsumptionRepository} from '../../application/port/out/RestaurantConsumptionRepository';
import {RestaurantConsumption} from '../../domain/aggregate/RestaurantConsumption';
import {DomainRejection} from '../../../../kernel/domain/DomainRejection';
import {Transaction} from '../../../../kernel/application/Transaction';
import {UseCase} from '../../../../kernel/application/UseCase';
import {RepositoryTransaction} from '../../../../infrastructure/storage/RepositoryTransaction';
import {AccountingEventMapper} from './AccountingEventMapper';
import {Domain} from '../../../../kernel/domain/Domain';

export class StorageRestaurantConsumptionRepository implements RestaurantConsumptionRepository {
    constructor(private readonly context: RepositoryTransaction) {
    }

    static project(event: SerializedEvent.Fact, state: Transaction.State): void {
        AccountingEventMapper.apply(event, state);
    }

    findById(id: string): RestaurantConsumption | undefined {
        const state = this.context.view().get<RestaurantConsumption.State>(this.key(id));
        return state ? RestaurantConsumption.reconstitute(state) : undefined;
    }

    all(): readonly RestaurantConsumption[] {
        return this.context.view().entries<RestaurantConsumption.State>('accounting/consumption/').map(s => RestaurantConsumption.reconstitute(s));
    }

    async apply(decision: RestaurantConsumption.Event | DomainRejection): Promise<RestaurantConsumption | undefined> {
        const event = UseCase.accept(decision);
        const activityId = event.type === 'ConsumptionStarted' ? event.facts.activityId : this.findById(event.aggregateId)?.activityId;
        Domain.require(activityId, 'CONSUMPTION_NOT_FOUND');
        const {scopeId, roomId} = this.context.activityScope(activityId);
        return this.context.run(scopeId, roomId, async (tx) => {
            await tx.stage(SerializedEvent.fact(event, this.key(event.aggregateId)));
            const state = tx.get<RestaurantConsumption.State>(this.key(event.aggregateId));
            return state ? RestaurantConsumption.reconstitute(state) : undefined;
        });
    }

    private key(id: string): string {
        return `accounting/consumption/${id}`;
    }
}
