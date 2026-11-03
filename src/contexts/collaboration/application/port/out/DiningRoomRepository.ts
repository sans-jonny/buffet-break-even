import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import type {DiningRoom} from '../../../domain/aggregate/DiningRoom';
import type {DomainRejection} from '../../../../../kernel/domain/DomainRejection';

export interface DiningRoomRepository {
    findById(id: string): DiningRoom | undefined;

    all(): readonly DiningRoom[];

    apply(event: DiningRoom.Event | DomainRejection): Promise<DiningRoom | undefined>;
}

export namespace DiningRoomRepository {
    export const token = Symbol('DiningRoomRepository') as InjectionToken<DiningRoomRepository>;
}
