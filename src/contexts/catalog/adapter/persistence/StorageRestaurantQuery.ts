import {UseCase} from '../../../../kernel/application/UseCase';
import type {RestaurantQuery} from '../../application/port/out/RestaurantQuery';
import type {RestaurantRepository} from '../../application/port/out/RestaurantRepository';

export class StorageRestaurantQuery implements RestaurantQuery {
    constructor(private readonly repository: RestaurantRepository) {
    }

    getById(scope: string, id: string) {
        const aggregate = this.repository.findById(scope, id);
        return UseCase.dto(aggregate?.snapshot());
    }

    list(scope: string) {
        return UseCase.dto(this.repository.all(scope).map(a => a.snapshot()));
    }
}
