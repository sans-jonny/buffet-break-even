import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {DiningActivityRepository} from '../../application/port/out/DiningActivityRepository';
import {DiningActivity} from '../../domain/aggregate/DiningActivity';
import {DomainRejection} from '../../../../kernel/domain/DomainRejection';
import {Transaction} from '../../../../kernel/application/Transaction';
import {UseCase} from '../../../../kernel/application/UseCase';
import {RepositoryTransaction} from '../../../../infrastructure/storage/RepositoryTransaction';
import {AccountingEventMapper} from './AccountingEventMapper';

export class StorageDiningActivityRepository implements DiningActivityRepository {
    constructor(private readonly context: RepositoryTransaction) {
    }

    static project(event: SerializedEvent.Fact, state: Transaction.State): void {
        AccountingEventMapper.apply(event, state);
    }

    findById(id: string): DiningActivity | undefined {
        const state = this.context.view().get<DiningActivity.State>(this.key(id));
        return state ? DiningActivity.reconstitute(state) : undefined;
    }

    all(): readonly DiningActivity[] {
        return this.context.view().entries<DiningActivity.State>('accounting/activity/').map(s => DiningActivity.reconstitute(s));
    }

    async apply(decision: DiningActivity.Event | DomainRejection): Promise<DiningActivity | undefined> {
        const event = UseCase.accept(decision);
        const {
            scopeId,
            roomId
        } = this.context.activityScope(event.aggregateId, event.type === 'DiningStarted' && event.facts.mode === 'SHARED');
        return this.context.run(scopeId, roomId, async (tx) => {
            await tx.stage(SerializedEvent.fact(event, this.key(event.aggregateId)));
            const state = tx.get<DiningActivity.State>(this.key(event.aggregateId));
            return state ? DiningActivity.reconstitute(state) : undefined;
        });
    }

    private key(id: string): string {
        return `accounting/activity/${id}`;
    }
}
