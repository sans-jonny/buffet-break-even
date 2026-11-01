import {Domain} from '../../../kernel/domain/Domain';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {GetRestaurantUseCase} from '../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {
    CalculateDiningResultUseCase
} from '../../../contexts/accounting/application/port/in/CalculateDiningResultUseCase';
import {GetDiningResultUseCase} from '../port/in/GetDiningResultUseCase';

export class GetDiningResultInteractor implements GetDiningResultUseCase {
    constructor(private readonly calculateDiningResult: CalculateDiningResultUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly getRoom: GetRoomUseCase) {
    }

    execute(r: GetDiningResultUseCase.Request): GetDiningResultUseCase.Response {
        const room = r.session.roomId ? this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value : undefined;
        if (room?.status === 'ENDED')
            Domain.require(room.eligibleIds.includes(r.actor.id), 'NOT_ELIGIBLE');
        const catalog = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.session.roomId || 'local', r.restaurantId)).value;
        Domain.require(catalog, 'RESTAURANT_NOT_FOUND');
        const diners = room ? room.members.filter(m => m.online && m.present).map(({id, nickname}) => ({
            id,
            nickname
        })) : [r.actor];
        return new GetDiningResultUseCase.Response(this.calculateDiningResult.execute(new CalculateDiningResultUseCase.Request(r.session.activityId, catalog, r.date, diners)).value);
    }
}
