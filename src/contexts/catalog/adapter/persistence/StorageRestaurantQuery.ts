import {UseCase} from '../../../../kernel/application/UseCase';
import type {RestaurantQuery} from '../../application/port/out/RestaurantQuery';
import type {RestaurantRepository} from '../../application/port/out/RestaurantRepository';

export class StorageRestaurantQuery implements RestaurantQuery {
    constructor(private readonly repository: RestaurantRepository) {
    }

    getById(scope: string, id: string) {
        if (scope !== 'local') {
            const local = this.repository.findById('local', id);
            if (local?.type === 'PUBLIC') return UseCase.dto(local.snapshot());
        }
        const aggregate = this.repository.findById(scope, id);
        return UseCase.dto(scope !== 'local' && aggregate?.type === 'PUBLIC' ? undefined : aggregate?.snapshot());
    }

    list(scope: string) {
        const stored = this.repository.all(scope);
        return UseCase.dto((scope === 'local' ? stored : [
            ...this.repository.all('local').filter(restaurant => restaurant.type === 'PUBLIC'),
            ...stored.filter(restaurant => restaurant.type !== 'PUBLIC')
        ]).map(a => a.snapshot()));
    }
}
