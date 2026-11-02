import {Domain} from '../../../kernel/domain/Domain';
import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import {Dining} from '../dto/Dining';
import {GetRestaurantUseCase} from '../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {GetConsumptionUseCase} from '../../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {CreateConsumptionUseCase} from '../../../contexts/accounting/application/port/in/CreateConsumptionUseCase';

/** Prepares an editable round within the caller's transaction; it never commits separately. */
export class EditableDiningRound {
    static readonly token = Symbol('EditableDiningRound') as InjectionToken<EditableDiningRound>;
    constructor(private readonly restaurants: GetRestaurantUseCase,
                private readonly consumptions: GetConsumptionUseCase,
                private readonly createConsumption: CreateConsumptionUseCase,
                private readonly id: () => string) {}

    async prepare(session: Dining.Session, restaurantId: string, productId?: string): Promise<string> {
        const catalog = this.restaurants.execute(new GetRestaurantUseCase.Request(session.roomId || 'local', restaurantId)).value;
        Domain.require(catalog, 'RESTAURANT_NOT_FOUND');
        Domain.require(!catalog.deleted, 'RESTAURANT_UNAVAILABLE');
        if (productId !== undefined)
            Domain.require(catalog.products.some(product => product.id === productId), 'PRODUCT_NOT_FOUND');
        let consumption = this.consumptions.execute(new GetConsumptionUseCase.Request(session.activityId, restaurantId)).value;
        if (!consumption)
            consumption = (await this.createConsumption.execute(new CreateConsumptionUseCase.Request(session, session.activityId, restaurantId, this.id()))).value;
        const roundId = consumption.rounds.find(round => round.status === 'ACTIVE')?.id;
        Domain.require(roundId, 'ROUND_LOCKED');
        return roundId;
    }
}
