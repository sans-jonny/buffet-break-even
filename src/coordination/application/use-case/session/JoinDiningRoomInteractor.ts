import {DiningSelectionPendingError} from '../../service/DiningSelectionPendingError';
import {JoinDiningRoomUseCase} from '../../port/in/session/JoinDiningRoomUseCase';
import {JoinMultiplayerDiningUseCase} from '../../port/in/room/JoinMultiplayerDiningUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {SelectDiningSessionUseCase} from '../../port/in/device/SelectDiningSessionUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import type {DiningPreferences} from '../../port/out/session/DiningPreferences';
import type {RoomGateway} from '../../port/out/session/RoomGateway';
import type {RoomConnection} from '../../port/out/session/RoomConnection';
import {InvalidRequestError} from '../../../../kernel/application/InvalidRequestError';
import {ChangeMemberNicknameUseCase} from '../../../../contexts/collaboration/application/port/in/ChangeMemberNicknameUseCase';

export class JoinDiningRoomInteractor implements JoinDiningRoomUseCase {
    constructor(private readonly join: JoinMultiplayerDiningUseCase, private readonly select: SelectDiningSessionUseCase,
                private readonly personal: GetPersonalDiningUseCase, private readonly room: GetRoomUseCase,
                private readonly preferences: DiningPreferences, private readonly rooms: RoomGateway,
                private readonly connection: RoomConnection, private readonly changeNickname: ChangeMemberNicknameUseCase) {}
    async execute(request: JoinDiningRoomUseCase.Request): Promise<JoinDiningRoomUseCase.Response> {
        const roomId = request.code ? (await this.rooms.locate(request.code)).roomId : this.preferences.lastRoom();
        if (!roomId) throw new InvalidRequestError('没有上次房间');
        const actor = this.personal.execute().identity;
        if (!actor) throw new InvalidRequestError('IDENTITY_REQUIRED');
        await this.preferences.rememberRoom(roomId);
        try {
            await this.connection.watch(roomId);
            if (this.connection.hasUnconfirmed?.(roomId)) await this.connection.acknowledge(roomId);
            const room = this.room.execute(new GetRoomUseCase.Request(roomId)).value;
            const member = room?.members.find(member => member.id === actor.id && member.present && member.online);
            if (room?.status === 'ACTIVE' && member && member.nickname !== actor.nickname)
                await this.changeNickname.execute(new ChangeMemberNicknameUseCase.Request({scopeId: roomId, roomId}, roomId, actor.id, actor.nickname));
            const session = (await this.join.execute(new JoinMultiplayerDiningUseCase.Request(roomId, actor))).value;
            try {
                await this.select.execute(new SelectDiningSessionUseCase.Request(session));
            } catch (error) {
                throw new DiningSelectionPendingError(session, error);
            }
            return new JoinDiningRoomUseCase.Response(session);
        } catch (error) {
            const code = (error as Error)?.message;
            if (code !== 'UNKNOWN_COMMIT_OUTCOME' && code !== 'SYNC_PENDING') this.connection.stop();
            throw error;
        }
    }
}
