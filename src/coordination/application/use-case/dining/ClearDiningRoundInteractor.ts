import {Domain} from '../../../../kernel/domain/Domain';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {ClearDiningRoundUseCase} from '../../port/in/dining/ClearDiningRoundUseCase';
import {CreateConsumptionUseCase} from '../../../../contexts/accounting/application/port/in/CreateConsumptionUseCase';
import {ClearRoundUseCase} from '../../../../contexts/accounting/application/port/in/ClearRoundUseCase';
import {GetConsumptionUseCase} from '../../../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {GetRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class ClearDiningRoundInteractor extends TransactionalInteractor<ClearDiningRoundUseCase.Request, ClearDiningRoundUseCase.Response> implements ClearDiningRoundUseCase {
    constructor(transactions: TransactionRunner,
                private readonly getConsumption: GetConsumptionUseCase,
                private readonly createConsumption: CreateConsumptionUseCase,
                private readonly clearRound: ClearRoundUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly id: () => string) {
        super(transactions, ClearDiningRoundUseCase.token);
    }

    protected async executeInTransaction(r: ClearDiningRoundUseCase.Request,
                                         tx: Transaction.Context): Promise<ClearDiningRoundUseCase.Response> {
        if (r.session.roomId) {
            const room = this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value;
            Domain.require(room && room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, r.actorId, false));
        }
        const catalog = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.session.roomId || 'local', r.restaurantId)).value;
        Domain.require(catalog, 'RESTAURANT_NOT_FOUND');
        Domain.require(!catalog.deleted, 'RESTAURANT_UNAVAILABLE');
        let consumption = this.getConsumption.execute(new GetConsumptionUseCase.Request(r.session.activityId, r.restaurantId)).value;
        if (!consumption)
            consumption = (await this.createConsumption.execute(new CreateConsumptionUseCase.Request(r.scope, r.session.activityId, r.restaurantId, this.id()))).value;
        const roundId = consumption.rounds.find(a => a.status === 'ACTIVE')?.id;
        Domain.require(roundId, 'ROUND_LOCKED');
        await this.clearRound.execute(new ClearRoundUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId));
        return new ClearDiningRoundUseCase.Response(undefined);
    }
}
