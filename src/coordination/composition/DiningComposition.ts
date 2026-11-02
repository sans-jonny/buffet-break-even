import {DiningAccess} from '../application/service/DiningAccess';
import {EditableDiningRound} from '../application/service/EditableDiningRound';
import {RoomRestaurantPublisher} from '../application/port/out/catalog/RoomRestaurantPublisher';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {CreateDiningActivityUseCase} from '../../contexts/accounting/application/port/in/CreateDiningActivityUseCase';
import {CreateConsumptionUseCase} from '../../contexts/accounting/application/port/in/CreateConsumptionUseCase';
import {IncreaseProductUseCase} from '../../contexts/accounting/application/port/in/IncreaseProductUseCase';
import {DecreaseProductUseCase} from '../../contexts/accounting/application/port/in/DecreaseProductUseCase';
import {RemoveConsumptionItemUseCase} from '../../contexts/accounting/application/port/in/RemoveConsumptionItemUseCase';
import {ClearRoundUseCase} from '../../contexts/accounting/application/port/in/ClearRoundUseCase';
import {SubmitRoundUseCase} from '../../contexts/accounting/application/port/in/SubmitRoundUseCase';
import {ChangeTicketPriceUseCase} from '../../contexts/accounting/application/port/in/ChangeTicketPriceUseCase';
import {EndDiningActivityUseCase} from '../../contexts/accounting/application/port/in/EndDiningActivityUseCase';
import {AbandonDiningActivityUseCase} from '../../contexts/accounting/application/port/in/AbandonDiningActivityUseCase';
import {ReconcileConsumptionUseCase} from '../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {GetConsumptionUseCase} from '../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {ListDiningActivitiesUseCase} from '../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {CalculateDiningResultUseCase} from '../../contexts/accounting/application/port/in/CalculateDiningResultUseCase';
import {PublishRestaurantUseCase} from '../../contexts/catalog/application/port/in/PublishRestaurantUseCase';
import {ReplaceRoomRestaurantUseCase} from '../../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantUseCase} from '../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {ListRestaurantsUseCase} from '../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {OpenRoomUseCase} from '../../contexts/collaboration/application/port/in/OpenRoomUseCase';
import {JoinRoomUseCase} from '../../contexts/collaboration/application/port/in/JoinRoomUseCase';
import {LeaveRoomUseCase} from '../../contexts/collaboration/application/port/in/LeaveRoomUseCase';
import {TransferHostUseCase} from '../../contexts/collaboration/application/port/in/TransferHostUseCase';
import {EndRoomUseCase} from '../../contexts/collaboration/application/port/in/EndRoomUseCase';
import {AbandonRoomUseCase} from '../../contexts/collaboration/application/port/in/AbandonRoomUseCase';
import {GetRoomUseCase} from '../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {ListRoomsUseCase} from '../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {AuthorizeRoomUseCase} from '../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';
import {CreateSingleDiningInteractor} from '../application/use-case/dining/CreateSingleDiningInteractor';
import {CreateSingleDiningUseCase} from '../application/port/in/dining/CreateSingleDiningUseCase';
import {
    CreateMultiplayerDiningInteractor
} from '../application/use-case/dining/CreateMultiplayerDiningInteractor';
import {CreateMultiplayerDiningUseCase} from '../application/port/in/dining/CreateMultiplayerDiningUseCase';
import {JoinMultiplayerDiningInteractor} from '../application/use-case/room/JoinMultiplayerDiningInteractor';
import {JoinMultiplayerDiningUseCase} from '../application/port/in/room/JoinMultiplayerDiningUseCase';
import {IncreaseDiningProductInteractor} from '../application/use-case/dining/IncreaseDiningProductInteractor';
import {IncreaseDiningProductUseCase} from '../application/port/in/dining/IncreaseDiningProductUseCase';
import {DecreaseDiningProductInteractor} from '../application/use-case/dining/DecreaseDiningProductInteractor';
import {DecreaseDiningProductUseCase} from '../application/port/in/dining/DecreaseDiningProductUseCase';
import {RemoveDiningProductInteractor} from '../application/use-case/dining/RemoveDiningProductInteractor';
import {RemoveDiningProductUseCase} from '../application/port/in/dining/RemoveDiningProductUseCase';
import {ClearDiningRoundInteractor} from '../application/use-case/dining/ClearDiningRoundInteractor';
import {ClearDiningRoundUseCase} from '../application/port/in/dining/ClearDiningRoundUseCase';
import {SubmitDiningRoundInteractor} from '../application/use-case/dining/SubmitDiningRoundInteractor';
import {SubmitDiningRoundUseCase} from '../application/port/in/dining/SubmitDiningRoundUseCase';
import {
    ChangeDiningTicketPriceInteractor
} from '../application/use-case/dining/ChangeDiningTicketPriceInteractor';
import {ChangeDiningTicketPriceUseCase} from '../application/port/in/dining/ChangeDiningTicketPriceUseCase';
import {EndDiningInteractor} from '../application/use-case/dining/EndDiningInteractor';
import {EndDiningUseCase} from '../application/port/in/dining/EndDiningUseCase';
import {AbandonDiningInteractor} from '../application/use-case/dining/AbandonDiningInteractor';
import {AbandonDiningUseCase} from '../application/port/in/dining/AbandonDiningUseCase';
import {LeaveDiningRoomInteractor} from '../application/use-case/room/LeaveDiningRoomInteractor';
import {LeaveDiningRoomUseCase} from '../application/port/in/room/LeaveDiningRoomUseCase';
import {TransferDiningHostInteractor} from '../application/use-case/room/TransferDiningHostInteractor';
import {TransferDiningHostUseCase} from '../application/port/in/room/TransferDiningHostUseCase';
import {GetDiningResultInteractor} from '../application/use-case/dining/GetDiningResultInteractor';
import {GetDiningResultUseCase} from '../application/port/in/dining/GetDiningResultUseCase';

import {AbandonEmptyDiningUseCase} from '../application/port/in/dining/AbandonEmptyDiningUseCase';
import {GetDiningActivityUseCase} from '../../contexts/accounting/application/port/in/GetDiningActivityUseCase';
import {AbandonEmptyDiningInteractor} from '../application/use-case/dining/AbandonEmptyDiningInteractor';

export namespace DiningComposition {
    export function register(scope: UniAppUseCaseScope, options: {id: () => string; now: () => string}): void {
        scope.factory(AbandonEmptyDiningUseCase.token, () => new AbandonEmptyDiningInteractor(
            scope.resolve(TransactionRunner.token), scope.resolve(GetDiningActivityUseCase.token),
            scope.resolve(ListRestaurantsUseCase.token), scope.resolve(GetConsumptionUseCase.token),
            scope.resolve(AbandonDiningUseCase.token)
        ));
        scope.factory(DiningAccess.token, () => new DiningAccess(scope.resolve(GetRoomUseCase.token), scope.resolve(AuthorizeRoomUseCase.token)));
        scope.factory(EditableDiningRound.token, () => new EditableDiningRound(
            scope.resolve(GetRestaurantUseCase.token),
            scope.resolve(GetConsumptionUseCase.token),
            scope.resolve(CreateConsumptionUseCase.token),
            options.id
        ));
        scope.factory(CreateSingleDiningUseCase.token, () => new CreateSingleDiningInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(CreateDiningActivityUseCase.token),
            scope.resolve(ListRestaurantsUseCase.token)
        ));
        scope.factory(CreateMultiplayerDiningUseCase.token, () => new CreateMultiplayerDiningInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(CreateDiningActivityUseCase.token),
            scope.resolve(ListRestaurantsUseCase.token),
            scope.resolve(RoomRestaurantPublisher.token),
            scope.resolve(OpenRoomUseCase.token)
        ));
        scope.factory(JoinMultiplayerDiningUseCase.token, () => new JoinMultiplayerDiningInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(ListDiningActivitiesUseCase.token),
            scope.resolve(ReconcileConsumptionUseCase.token),
            scope.resolve(GetRestaurantUseCase.token),
            scope.resolve(ReplaceRoomRestaurantUseCase.token),
            scope.resolve(JoinRoomUseCase.token),
            scope.resolve(ListRoomsUseCase.token),
            scope.resolve(RoomRestaurantPublisher.token),
            options.now
        ));
        scope.factory(IncreaseDiningProductUseCase.token, () => new IncreaseDiningProductInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(EditableDiningRound.token),
            scope.resolve(IncreaseProductUseCase.token)
        ));
        scope.factory(DecreaseDiningProductUseCase.token, () => new DecreaseDiningProductInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(EditableDiningRound.token),
            scope.resolve(DecreaseProductUseCase.token)
        ));
        scope.factory(RemoveDiningProductUseCase.token, () => new RemoveDiningProductInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(EditableDiningRound.token),
            scope.resolve(RemoveConsumptionItemUseCase.token)
        ));
        scope.factory(ClearDiningRoundUseCase.token, () => new ClearDiningRoundInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(EditableDiningRound.token),
            scope.resolve(ClearRoundUseCase.token)
        ));
        scope.factory(SubmitDiningRoundUseCase.token, () => new SubmitDiningRoundInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(GetConsumptionUseCase.token),
            scope.resolve(SubmitRoundUseCase.token)
        ));
        scope.factory(ChangeDiningTicketPriceUseCase.token, () => new ChangeDiningTicketPriceInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(ChangeTicketPriceUseCase.token)
        ));
        scope.factory(EndDiningUseCase.token, () => new EndDiningInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(EndDiningActivityUseCase.token),
            scope.resolve(GetRestaurantUseCase.token),
            scope.resolve(EndRoomUseCase.token),
            options.now
        ));
        scope.factory(AbandonDiningUseCase.token, () => new AbandonDiningInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(AbandonDiningActivityUseCase.token),
            scope.resolve(AbandonRoomUseCase.token)
        ));
        scope.factory(LeaveDiningRoomUseCase.token, () => new LeaveDiningRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(LeaveRoomUseCase.token), options.now));
        scope.factory(TransferDiningHostUseCase.token, () => new TransferDiningHostInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningAccess.token),
            scope.resolve(TransferHostUseCase.token)
        ));
        scope.factory(GetDiningResultUseCase.token, () => new GetDiningResultInteractor(
            scope.resolve(CalculateDiningResultUseCase.token),
            scope.resolve(GetRestaurantUseCase.token),
            scope.resolve(GetRoomUseCase.token)
        ));
    }
}
