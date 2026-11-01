import type {DiningActivity} from '../../../domain/aggregate/DiningActivity';
import type {DomainRejection} from '../../../../../kernel/domain/DomainRejection';

export interface DiningActivityRepository {
    findById(id: string): DiningActivity | undefined;

    all(): readonly DiningActivity[];

    apply(event: DiningActivity.Event | DomainRejection): Promise<DiningActivity | undefined>;
}

export namespace DiningActivityRepository {
    export const token = Symbol('DiningActivityRepository');
}
