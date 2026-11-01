import {UseCase} from '../../../../kernel/application/UseCase';
import type {DiningActivityQuery} from '../../application/port/out/DiningActivityQuery';
import type {DiningActivityRepository} from '../../application/port/out/DiningActivityRepository';

export class StorageDiningActivityQuery implements DiningActivityQuery {
    constructor(private readonly repository: DiningActivityRepository) {
    }

    getById(id: string) {
        const aggregate = this.repository.findById(id);
        return UseCase.dto(aggregate?.snapshot());
    }

    list() {
        return UseCase.dto(this.repository.all().map(a => a.snapshot()));
    }
}
