import type {DiningPreferences} from '../../coordination/application/port/out/session/DiningPreferences';
import type {Transaction} from '../../kernel/application/Transaction';

export class StorageDiningPreferences implements DiningPreferences {
    constructor(private readonly storage: Transaction.Runner) {}

    lastRoom(): string | undefined {
        return this.storage.get<string>('personal/last-room');
    }

    rememberRoom(roomId: string): Promise<void> {
        return this.storage.local(state => { state['personal/last-room'] = roomId; });
    }

}
