import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ListDiningActivitiesUseCase} from '../port/in/ListDiningActivitiesUseCase';
import {DiningActivityQuery} from '../port/out/DiningActivityQuery';

export class ListDiningActivitiesInteractor extends ReadOnlyInteractor<ListDiningActivitiesUseCase.Request, ListDiningActivitiesUseCase.Response> implements ListDiningActivitiesUseCase {
    constructor(transactions: TransactionRunner, private readonly activities: DiningActivityQuery) {
        super(transactions);
    }

    protected read(r: ListDiningActivitiesUseCase.Request,
                   view?: Transaction.View): ListDiningActivitiesUseCase.Response {
        return new ListDiningActivitiesUseCase.Response(this.activities.list());
    }
}
