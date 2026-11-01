import {UseCase} from '../../../../kernel/application/UseCase';
import type {ConsumptionQuery} from '../../application/port/out/ConsumptionQuery';
import type {RestaurantConsumptionRepository} from '../../application/port/out/RestaurantConsumptionRepository';

export class StorageConsumptionQuery implements ConsumptionQuery {
    constructor(private readonly repository: RestaurantConsumptionRepository) {
    }

    getById(id: string) {
        const aggregate = this.repository.findById(id);
        return UseCase.dto(aggregate?.snapshot());
    }

    list() {
        return UseCase.dto(this.repository.all().map(a => a.snapshot()));
    }
}
