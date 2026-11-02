import {ExitDiningSessionUseCase} from '../../port/in/session/ExitDiningSessionUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {LeaveDiningSessionUseCase} from '../../port/in/session/LeaveDiningSessionUseCase';
import {AbandonEmptyDiningUseCase} from '../../port/in/dining/AbandonEmptyDiningUseCase';
import {ClearDiningSessionUseCase} from '../../port/in/device/ClearDiningSessionUseCase';

/** Actual exits leave shared rooms, but retain single-player meals with recorded consumption. */
export class ExitDiningSessionInteractor implements ExitDiningSessionUseCase {
    private pending?: Promise<ExitDiningSessionUseCase.Response>;

    constructor(private readonly personal: GetPersonalDiningUseCase,
                private readonly leave: LeaveDiningSessionUseCase,
                private readonly abandonEmpty: AbandonEmptyDiningUseCase,
                private readonly clear: ClearDiningSessionUseCase) {}

    execute(_request: ExitDiningSessionUseCase.Request): Promise<ExitDiningSessionUseCase.Response> {
        if (this.pending) return this.pending;
        this.pending = this.exit().finally(() => { this.pending = undefined; });
        return this.pending;
    }

    private async exit(): Promise<ExitDiningSessionUseCase.Response> {
        const {session, identity} = this.personal.execute();
        if (session && identity) {
            if (session.roomId) await this.leave.execute(new LeaveDiningSessionUseCase.Request());
            else if ((await this.abandonEmpty.execute(new AbandonEmptyDiningUseCase.Request(session, identity.id))).empty)
                await this.clear.execute(new ClearDiningSessionUseCase.Request());
        }
        return new ExitDiningSessionUseCase.Response();
    }
}
