import {GetDiningActivityUseCase} from '../../contexts/accounting/application/port/in/GetDiningActivityUseCase';
import {RecoverDiningSelectionInteractor} from '../application/use-case/session/RecoverDiningSelectionInteractor';
import {RecoverDiningSelectionUseCase} from '../application/port/in/session/RecoverDiningSelectionUseCase';
import {StartSingleDiningUseCase} from '../application/port/in/session/StartSingleDiningUseCase';
import {StartSingleDiningInteractor} from '../application/use-case/session/StartSingleDiningInteractor';
import {ResumeSingleDiningUseCase} from '../application/port/in/session/ResumeSingleDiningUseCase';
import {ResumeSingleDiningInteractor} from '../application/use-case/session/ResumeSingleDiningInteractor';
import {CreateDiningRoomUseCase} from '../application/port/in/session/CreateDiningRoomUseCase';
import {CreateDiningRoomInteractor} from '../application/use-case/session/CreateDiningRoomInteractor';
import {JoinDiningRoomUseCase} from '../application/port/in/session/JoinDiningRoomUseCase';
import {JoinDiningRoomInteractor} from '../application/use-case/session/JoinDiningRoomInteractor';
import {RefreshDiningSessionUseCase} from '../application/port/in/session/RefreshDiningSessionUseCase';
import {RefreshDiningSessionInteractor} from '../application/use-case/session/RefreshDiningSessionInteractor';
import {LeaveDiningSessionUseCase} from '../application/port/in/session/LeaveDiningSessionUseCase';
import {LeaveDiningSessionInteractor} from '../application/use-case/session/LeaveDiningSessionInteractor';
import {AcknowledgeDiningSubmissionUseCase} from '../application/port/in/session/AcknowledgeDiningSubmissionUseCase';
import {AcknowledgeDiningSubmissionInteractor} from '../application/use-case/session/AcknowledgeDiningSubmissionInteractor';
import {RoomGateway} from '../application/port/out/session/RoomGateway';
import {RoomConnection} from '../application/port/out/session/RoomConnection';
import {DiningPreferences} from '../application/port/out/session/DiningPreferences';
import {GetPersonalDiningUseCase} from '../application/port/in/device/GetPersonalDiningUseCase';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {ListRestaurantsUseCase} from '../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {GetRoomUseCase} from '../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {CreateSingleDiningUseCase} from '../application/port/in/dining/CreateSingleDiningUseCase';
import {CreateMultiplayerDiningUseCase} from '../application/port/in/dining/CreateMultiplayerDiningUseCase';
import {JoinMultiplayerDiningUseCase} from '../application/port/in/room/JoinMultiplayerDiningUseCase';
import {LeaveDiningRoomUseCase} from '../application/port/in/room/LeaveDiningRoomUseCase';
import {SelectDiningSessionUseCase} from '../application/port/in/device/SelectDiningSessionUseCase';
import {ClearDiningSessionUseCase} from '../application/port/in/device/ClearDiningSessionUseCase';
import {ChangeMemberNicknameUseCase} from '../../contexts/collaboration/application/port/in/ChangeMemberNicknameUseCase';

export namespace SessionComposition {
    export function register(scope: Pick<UniAppUseCaseScope, 'provide' | 'resolve'>, id: () => string): void {
        const connection = scope.resolve(RoomConnection.token);
        scope.provide(RecoverDiningSelectionUseCase.token, new RecoverDiningSelectionInteractor(
            scope.resolve(GetPersonalDiningUseCase.token),
            scope.resolve(GetDiningActivityUseCase.token),
            scope.resolve(GetRoomUseCase.token),
            scope.resolve(SelectDiningSessionUseCase.token),
            connection
        ));
        scope.provide(StartSingleDiningUseCase.token, new StartSingleDiningInteractor(
            scope.resolve(CreateSingleDiningUseCase.token),
            scope.resolve(SelectDiningSessionUseCase.token),
            connection,
            id
        ));
        scope.provide(ResumeSingleDiningUseCase.token, new ResumeSingleDiningInteractor(scope.resolve(SelectDiningSessionUseCase.token), connection));
        scope.provide(CreateDiningRoomUseCase.token, new CreateDiningRoomInteractor(
            scope.resolve(CreateMultiplayerDiningUseCase.token),
            scope.resolve(SelectDiningSessionUseCase.token),
            scope.resolve(GetPersonalDiningUseCase.token),
            scope.resolve(ListRestaurantsUseCase.token),
            scope.resolve(DiningPreferences.token),
            scope.resolve(RoomGateway.token),
            connection,
            id
        ));
        scope.provide(JoinDiningRoomUseCase.token, new JoinDiningRoomInteractor(
            scope.resolve(JoinMultiplayerDiningUseCase.token),
            scope.resolve(SelectDiningSessionUseCase.token),
            scope.resolve(GetPersonalDiningUseCase.token),
            scope.resolve(GetRoomUseCase.token),
            scope.resolve(DiningPreferences.token),
            scope.resolve(RoomGateway.token),
            connection,
            scope.resolve(ChangeMemberNicknameUseCase.token)
        ));
        scope.provide(RefreshDiningSessionUseCase.token, new RefreshDiningSessionInteractor(scope.resolve(GetPersonalDiningUseCase.token), connection));
        scope.provide(LeaveDiningSessionUseCase.token, new LeaveDiningSessionInteractor(
            scope.resolve(LeaveDiningRoomUseCase.token),
            scope.resolve(ClearDiningSessionUseCase.token),
            scope.resolve(GetPersonalDiningUseCase.token),
            connection,
            scope.resolve(GetRoomUseCase.token)
        ));
        scope.provide(AcknowledgeDiningSubmissionUseCase.token, new AcknowledgeDiningSubmissionInteractor(scope.resolve(GetPersonalDiningUseCase.token), connection));
    }
}
