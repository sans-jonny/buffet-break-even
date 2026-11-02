import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {LocalDiningData} from '../../port/out/device/LocalDiningData';
import {UseCase} from '../../../../kernel/application/UseCase';

export class GetPersonalDiningInteractor implements GetPersonalDiningUseCase {
    constructor(private readonly data: LocalDiningData) {}
    execute(): GetPersonalDiningUseCase.Response {
        return UseCase.dto({identity: this.data.identity(), session: this.data.session(),
            receipt: this.data.receipt(), history: this.data.history()});
    }
}
