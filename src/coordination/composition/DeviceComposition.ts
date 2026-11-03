import {InitializeDiningUseCase} from '../application/port/in/initialization/InitializeDiningUseCase';
import {InitializeDiningInteractor} from '../application/use-case/initialization/InitializeDiningInteractor';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {GetPersonalDiningUseCase} from '../application/port/in/device/GetPersonalDiningUseCase';
import {GetPersonalDiningInteractor} from '../application/use-case/device/GetPersonalDiningInteractor';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {LocalDiningData} from '../application/port/out/device/LocalDiningData';
import {ListRestaurantsUseCase} from '../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {GetRoomUseCase} from '../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {InitializeIdentityInteractor} from '../application/use-case/device/InitializeIdentityInteractor';
import {InitializeIdentityUseCase} from '../application/port/in/device/InitializeIdentityUseCase';
import {ChangeNicknameInteractor} from '../application/use-case/device/ChangeNicknameInteractor';
import {ChangeNicknameUseCase} from '../application/port/in/device/ChangeNicknameUseCase';
import {SelectDiningSessionInteractor} from '../application/use-case/device/SelectDiningSessionInteractor';
import {SelectDiningSessionUseCase} from '../application/port/in/device/SelectDiningSessionUseCase';
import {ClearDiningSessionInteractor} from '../application/use-case/device/ClearDiningSessionInteractor';
import {ClearDiningSessionUseCase} from '../application/port/in/device/ClearDiningSessionUseCase';
import {SaveReceiptInteractor} from '../application/use-case/records/SaveReceiptInteractor';
import {SaveReceiptUseCase} from '../application/port/in/records/SaveReceiptUseCase';
import {SaveDiningHistoryInteractor} from '../application/use-case/records/SaveDiningHistoryInteractor';
import {SaveDiningHistoryUseCase} from '../application/port/in/records/SaveDiningHistoryUseCase';
import {DeleteReceiptInteractor} from '../application/use-case/records/DeleteReceiptInteractor';
import {DeleteReceiptUseCase} from '../application/port/in/records/DeleteReceiptUseCase';
import {DeleteDiningHistoryInteractor} from '../application/use-case/records/DeleteDiningHistoryInteractor';
import {DeleteDiningHistoryUseCase} from '../application/port/in/records/DeleteDiningHistoryUseCase';
import {PublishLocalRestaurantUseCase} from '../application/port/in/catalog/PublishLocalRestaurantUseCase';

import {ChangeLocalNicknameUseCase} from '../application/port/in/device/ChangeLocalNicknameUseCase';
import {ChangeLocalNicknameInteractor} from '../application/use-case/device/ChangeLocalNicknameInteractor';
import {ListRoomsUseCase} from '../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {ChangeMemberNicknameUseCase} from '../../contexts/collaboration/application/port/in/ChangeMemberNicknameUseCase';

export namespace DeviceComposition {
    export function register(scope: UniAppUseCaseScope, options: {id: () => string; now: () => string}, personalRunner: InjectionToken<TransactionRunner>): void {
        scope.factory(GetPersonalDiningUseCase.token, () => new GetPersonalDiningInteractor(scope.resolve(LocalDiningData.token)));
        scope.factory(InitializeIdentityUseCase.token, () => new InitializeIdentityInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(ChangeLocalNicknameUseCase.token, () => new ChangeLocalNicknameInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(ChangeNicknameUseCase.token, () => new ChangeNicknameInteractor(
            scope.resolve(ChangeLocalNicknameUseCase.token), scope.resolve(GetPersonalDiningUseCase.token),
            scope.resolve(ListRoomsUseCase.token), scope.resolve(ChangeMemberNicknameUseCase.token)
        ));
        scope.factory(SelectDiningSessionUseCase.token, () => new SelectDiningSessionInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(ClearDiningSessionUseCase.token, () => new ClearDiningSessionInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(SaveReceiptUseCase.token, () => new SaveReceiptInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(SaveDiningHistoryUseCase.token, () => new SaveDiningHistoryInteractor(
            scope.resolve(personalRunner),
            scope.resolve(LocalDiningData.token),
            scope.resolve(GetRoomUseCase.token)
        ));
        scope.factory(DeleteReceiptUseCase.token, () => new DeleteReceiptInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(DeleteDiningHistoryUseCase.token, () => new DeleteDiningHistoryInteractor(scope.resolve(personalRunner), scope.resolve(LocalDiningData.token)));
        scope.factory(InitializeDiningUseCase.token, () => new InitializeDiningInteractor(
            scope.resolve(InitializeIdentityUseCase.token),
            scope.resolve(ListRestaurantsUseCase.token),
            scope.resolve(PublishLocalRestaurantUseCase.token),
            options.id
        ));
    }
}
