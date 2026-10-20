import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {useRoomStore} from '@/stores/useRoomStore'
import {productAppearance} from '@/components/product-card/productAppearance'
import {LocalRoomCatalogGateway} from '../adapter/gateway/LocalRoomCatalogGateway'
import {UniRoomSocket} from '../adapter/gateway/UniRoomSocket'
import {RoomPresenter} from '../adapter/presenter/RoomPresenter'
import type {RoomCredentials, RoomError, RoomResult, RoomSnapshot} from '../application/types'
import {CreateRoomInteractor} from '../application/interactor/CreateRoomInteractor'
import {JoinRoomInteractor} from '../application/interactor/JoinRoomInteractor'
import {RenameInteractor} from '../application/interactor/RenameInteractor'
import {BeginRoomInteractor} from '../application/interactor/BeginRoomInteractor'
import {ChangeRoomSelectionInteractor} from '../application/interactor/ChangeRoomSelectionInteractor'
import {CommitRoomRoundInteractor} from '../application/interactor/CommitRoomRoundInteractor'
import {FinishRoomInteractor} from '../application/interactor/FinishRoomInteractor'
import {CloseRoomInteractor} from '../application/interactor/CloseRoomInteractor'
import {LeaveRoomInteractor} from '../application/interactor/LeaveRoomInteractor'
import {CreateRoomInput} from '../public'
import {JoinRoomInput} from '../public'
import {RenameInput} from '../public'
import {BeginRoomInput} from '../public'
import {ChangeRoomSelectionInput} from '../public'
import {CommitRoomRoundInput} from '../public'
import {FinishRoomInput} from '../public'
import {CloseRoomInput} from '../public'
import {LeaveRoomInput} from '../public'

export function registerRoom(app: App, pinia: Pinia, url: string): void {
    const transport = new UniRoomSocket(url)
    const catalog = new LocalRoomCatalogGateway()
    const presenter = new RoomPresenter(useRoomStore(pinia), catalog, productAppearance)

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

    app.provide<CreateRoomInput>(CreateRoomInput.Token, new CreateRoomInteractor(transport))
    app.provide<JoinRoomInput>(JoinRoomInput.Token, new JoinRoomInteractor(transport))
    app.provide<RenameInput>(RenameInput.Token, new RenameInteractor(transport))
    app.provide<BeginRoomInput>(BeginRoomInput.Token, new BeginRoomInteractor(transport))
    app.provide<ChangeRoomSelectionInput>(ChangeRoomSelectionInput.Token, new ChangeRoomSelectionInteractor(transport))
    app.provide<CommitRoomRoundInput>(CommitRoomRoundInput.Token, new CommitRoomRoundInteractor(transport))
    app.provide<FinishRoomInput>(FinishRoomInput.Token, new FinishRoomInteractor(transport))
    app.provide<CloseRoomInput>(CloseRoomInput.Token, new CloseRoomInteractor(transport))
    app.provide<LeaveRoomInput>(LeaveRoomInput.Token, new LeaveRoomInteractor(transport))
}
