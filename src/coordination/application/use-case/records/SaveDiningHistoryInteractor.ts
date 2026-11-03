import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {SaveDiningHistoryUseCase} from '../../port/in/records/SaveDiningHistoryUseCase';
import {LocalDiningData} from '../../port/out/device/LocalDiningData';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';

export class SaveDiningHistoryInteractor extends TransactionalInteractor<SaveDiningHistoryUseCase.Request, SaveDiningHistoryUseCase.Response> implements SaveDiningHistoryUseCase {
    constructor(transactions: TransactionRunner,
                private readonly data: LocalDiningData,
                private readonly getRoom: GetRoomUseCase) {
        super(transactions, SaveDiningHistoryUseCase.token);
    }

    protected async executeInTransaction(r: SaveDiningHistoryUseCase.Request,
                                         tx: Transaction.Context): Promise<SaveDiningHistoryUseCase.Response> {

        const room = r.session.roomId ? this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId, {memberId: this.data.identity()!.id, access: 'HISTORY'})).value : undefined;

        await this.data.saveHistory(r.session, r.result, tx);
        return new SaveDiningHistoryUseCase.Response();
    }
}
