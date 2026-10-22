import type {RoomView} from '@/presentation/room/RoomView'
import type {ProductAppearanceProvider} from '@/presentation/dining/ProductAppearanceProvider'
import {LocalRoomCatalogGateway} from './infrastructure/gateway/LocalRoomCatalogGateway'
import {UniRoomSocket} from './infrastructure/gateway/UniRoomSocket'
import {RoomPresenter} from './infrastructure/presentation/RoomPresenter'
import type {RoomCredentials, RoomError, RoomResult, RoomSnapshot} from './model/types'
import {CreateRoomInteractor} from './application/interactor/CreateRoomInteractor'
import {JoinRoomInteractor} from './application/interactor/JoinRoomInteractor'
import {RenameInteractor} from './application/interactor/RenameInteractor'
import {BeginRoomInteractor} from './application/interactor/BeginRoomInteractor'
import {ChangeRoomSelectionInteractor} from './application/interactor/ChangeRoomSelectionInteractor'
import {CommitRoomRoundInteractor} from './application/interactor/CommitRoomRoundInteractor'
import {FinishRoomInteractor} from './application/interactor/FinishRoomInteractor'
import {CloseRoomInteractor} from './application/interactor/CloseRoomInteractor'
import {LeaveRoomInteractor} from './application/interactor/LeaveRoomInteractor'

export function createRoom(url: string, view: RoomView, appearance: ProductAppearanceProvider) {
    const transport = new UniRoomSocket(url)
    const catalog = new LocalRoomCatalogGateway()
    const presenter = new RoomPresenter(view, catalog, appearance)

    transport.onMessage((event, data) => {
        switch (event) {
            case 'created':
            case 'joined':
                presenter.presentCredentials(data as RoomCredentials)
                break
            case 'roomState':
                presenter.presentState(data as RoomSnapshot)
                break
            case 'finished':
                presenter.presentResult(data as RoomResult)
                break
            case 'error':
                presenter.presentError(data as RoomError)
                break
            case 'roomEnded':
                presenter.presentEnded()
                break
            case 'left':
                presenter.presentLeft()
                break
        }
    })
    transport.onStatus(status => presenter.presentConnection(status))

    return {
        createRoom: new CreateRoomInteractor(transport),
        joinRoom: new JoinRoomInteractor(transport),
        rename: new RenameInteractor(transport),
        beginRoom: new BeginRoomInteractor(transport),
        changeRoomSelection: new ChangeRoomSelectionInteractor(transport),
        commitRoomRound: new CommitRoomRoundInteractor(transport),
        finishRoom: new FinishRoomInteractor(transport),
        closeRoom: new CloseRoomInteractor(transport),
        leaveRoom: new LeaveRoomInteractor(transport),
    }
}
