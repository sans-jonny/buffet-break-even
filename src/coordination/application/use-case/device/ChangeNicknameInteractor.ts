import {ChangeNicknameUseCase} from '../../port/in/device/ChangeNicknameUseCase';
import {ChangeLocalNicknameUseCase} from '../../port/in/device/ChangeLocalNicknameUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {ListRoomsUseCase} from '../../../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {ChangeMemberNicknameUseCase} from '../../../../contexts/collaboration/application/port/in/ChangeMemberNicknameUseCase';

/** Personal identity and each room have separate commit points; retries only change stale names. */
export class ChangeNicknameInteractor implements ChangeNicknameUseCase {
    constructor(private readonly local: ChangeLocalNicknameUseCase, private readonly personal: GetPersonalDiningUseCase,
                private readonly rooms: ListRoomsUseCase, private readonly changeMember: ChangeMemberNicknameUseCase) {}
    async execute(r: ChangeNicknameUseCase.Request): Promise<ChangeNicknameUseCase.Response> {
        await this.local.execute(new ChangeLocalNicknameUseCase.Request(r.nickname));
        const identity = this.personal.execute().identity!;
        let failure: unknown;
        for (const room of this.rooms.execute(new ListRoomsUseCase.Request()).value) {
            if (room.status !== 'ACTIVE' || !room.members.some(m => m.id === identity.id && m.present && m.online && m.nickname !== identity.nickname)) continue;
            try {
                await this.changeMember.execute(new ChangeMemberNicknameUseCase.Request(
                    {scopeId: room.id, roomId: room.id}, room.id, identity.id, identity.nickname));
            } catch (error) {
                if ((error as Error).message !== 'REJECTED_404') failure ??= error;
            }
        }
        if (failure) throw failure;
        return new ChangeNicknameUseCase.Response();
    }
}
