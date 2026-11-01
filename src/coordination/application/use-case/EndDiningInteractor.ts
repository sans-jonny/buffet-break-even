import {Domain} from '../../../kernel/domain/Domain';
import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {EndDiningUseCase} from '../port/in/EndDiningUseCase';
import {EndDiningActivityUseCase} from '../../../contexts/accounting/application/port/in/EndDiningActivityUseCase';
import {GetRestaurantUseCase} from '../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {EndRoomUseCase} from '../../../contexts/collaboration/application/port/in/EndRoomUseCase';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class EndDiningInteractor extends TransactionalInteractor<EndDiningUseCase.Request, EndDiningUseCase.Response> implements EndDiningUseCase {
    constructor(transactions: TransactionRunner,
                private readonly endDiningActivity: EndDiningActivityUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly endRoom: EndRoomUseCase,
                private readonly now: () => string) {
        super(transactions, EndDiningUseCase.token);
    }

    protected async executeInTransaction(r: EndDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<EndDiningUseCase.Response> {
        const actorId = r.actor.id;
        if (r.session.roomId)
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, actorId, true));
        const room = r.session.roomId ? this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value : undefined;
        Domain.require(!room || room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
        const catalog = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.session.roomId || 'local', r.finalRestaurantId)).value;
        Domain.require(catalog, 'RESTAURANT_NOT_FOUND');
        const diners = room ? room.members.filter(m => m.online && m.present).map(({id, nickname}) => ({
            id,
            nickname
        })) : [r.actor];
        const result = (await this.endDiningActivity.execute(new EndDiningActivityUseCase.Request(r.scope, r.session.activityId, catalog, this.now(), diners))).value;
        if (r.session.roomId)
            await this.endRoom.execute(new EndRoomUseCase.Request(r.scope, r.session.roomId, actorId));
        return new EndDiningUseCase.Response(result);
    }
}
