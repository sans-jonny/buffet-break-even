import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {DiningRoomRepository} from '../../application/port/out/DiningRoomRepository';
import {DiningRoom} from '../../domain/aggregate/DiningRoom';
import {DomainRejection} from '../../../../kernel/domain/DomainRejection';
import {Transaction} from '../../../../kernel/application/Transaction';
import {UseCase} from '../../../../kernel/application/UseCase';
import {RepositoryTransaction} from '../../../../infrastructure/storage/RepositoryTransaction';
import {CollaborationEventMapper} from './CollaborationEventMapper';

export class StorageDiningRoomRepository implements DiningRoomRepository {
    constructor(private readonly context: RepositoryTransaction) {
    }

    static project(event: SerializedEvent.Fact, state: Transaction.State): void {
        CollaborationEventMapper.apply(event, state);
    }

    findById(id: string): DiningRoom | undefined {
        const state = this.context.view().get<DiningRoom.State>(this.key(id));
        return state ? DiningRoom.reconstitute(state) : undefined;
    }

    all(): readonly DiningRoom[] {
        return this.context.view().entries<DiningRoom.State>('collaboration/room/').map(s => DiningRoom.reconstitute(s));
    }

    async apply(decision: DiningRoom.Event | DomainRejection): Promise<DiningRoom | undefined> {
        const event = UseCase.accept(decision);
        const scopeId = event.aggregateId, roomId = event.aggregateId;
        return this.context.run(scopeId, roomId, async (tx) => {
            await tx.stage(SerializedEvent.fact(event, this.key(event.aggregateId)));
            const state = tx.get<DiningRoom.State>(this.key(event.aggregateId));
            return state ? DiningRoom.reconstitute(state) : undefined;
        });
    }

    private key(id: string): string {
        return `collaboration/room/${id}`;
    }
}
