import {Domain} from '../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../kernel/application/Transaction';
import {SaveDiningHistoryUseCase} from '../port/in/SaveDiningHistoryUseCase';
import {LocalDiningData} from '../port/out/LocalDiningData';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';

export class SaveDiningHistoryInteractor extends TransactionalInteractor<SaveDiningHistoryUseCase.Request, SaveDiningHistoryUseCase.Response> implements SaveDiningHistoryUseCase {
    constructor(transactions: TransactionRunner,
                private readonly data: LocalDiningData,
                private readonly getRoom: GetRoomUseCase) {
        super(transactions, SaveDiningHistoryUseCase.token);
    }

    protected async executeInTransaction(r: SaveDiningHistoryUseCase.Request,
                                         tx: Transaction.Context): Promise<SaveDiningHistoryUseCase.Response> {
        Domain.require(r.result.activityId === r.session.activityId, 'WRONG_RESULT');
        const room = r.session.roomId ? this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value : undefined;
        Domain.require(!room || room.eligibleIds.includes(this.data.identity()!.id), 'NOT_ELIGIBLE');
        await this.data.saveHistory(r.session, r.result, tx);
        return new SaveDiningHistoryUseCase.Response();
    }
}
