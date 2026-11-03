import {Domain} from '../../../../kernel/domain/Domain';
import {DiningActivity} from '../../domain/aggregate/DiningActivity';
import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {GetDiningActivityUseCase} from '../port/in/GetDiningActivityUseCase';
import {DiningActivityQuery} from '../port/out/DiningActivityQuery';

export class GetDiningActivityInteractor extends ReadOnlyInteractor<GetDiningActivityUseCase.Request, GetDiningActivityUseCase.Response> implements GetDiningActivityUseCase {
    constructor(transactions: TransactionRunner, private readonly activities: DiningActivityQuery) {
        super(transactions);
    }

    protected read(r: GetDiningActivityUseCase.Request, view?: Transaction.View): GetDiningActivityUseCase.Response {
        const value = this.activities.getById(r.activityId);
        if (r.context) {
            Domain.require(value, 'ACTIVITY_NOT_FOUND');
            const domain = DiningActivity.reconstitute(value);
            if (r.context.singleScopeId) domain.authorizeSingle(r.context.singleScopeId);
        }
        return new GetDiningActivityUseCase.Response(value);
    }
}
