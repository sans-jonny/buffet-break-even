import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {CopyRestaurantToRoomUseCase} from '../port/in/CopyRestaurantToRoomUseCase';
import {Restaurant} from '../../domain/aggregate/Restaurant';
import {RestaurantRepository} from '../port/out/RestaurantRepository';

export class CopyRestaurantToRoomInteractor extends TransactionalInteractor<CopyRestaurantToRoomUseCase.Request, CopyRestaurantToRoomUseCase.Response> implements CopyRestaurantToRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly restaurants: RestaurantRepository) {
        super(transactions, CopyRestaurantToRoomUseCase.token);
    }

    protected async executeInTransaction(r: CopyRestaurantToRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<CopyRestaurantToRoomUseCase.Response> {
        const original = Restaurant.reconstitute(r.original);
        const saved = await this.restaurants.apply(r.roomId, original.copyIntoRoom(r.roomId));
        return new CopyRestaurantToRoomUseCase.Response(saved!.snapshot());
    }
}
