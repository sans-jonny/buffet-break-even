import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import type {Transaction} from '../../../../../kernel/application/Transaction';
import type {Dining} from '../../../dto/Dining';

export interface LocalDiningData {
    identity(): Dining.Identity | undefined;

    session(): Dining.Session | undefined;

    receipts(): readonly Dining.Result[];

    history(): readonly Dining.Result[];

    initialize(id: string, nickname: string, tx: Transaction.Context): Promise<void>;

    changeNickname(nickname: string, tx: Transaction.Context): Promise<void>;

    selectSession(session: Dining.Session, tx: Transaction.Context): Promise<void>;

    clearSession(tx: Transaction.Context): Promise<void>;

    saveReceipt(result: Dining.Result, tx: Transaction.Context): Promise<void>;

    saveHistory(session: Dining.Session, result: Dining.Result, tx: Transaction.Context): Promise<void>;

    deleteReceipt(activityId: string, tx: Transaction.Context): Promise<void>;

    deleteHistory(activityId: string, tx: Transaction.Context): Promise<void>;
}

export namespace LocalDiningData {
    export const token = Symbol('LocalDiningData') as InjectionToken<LocalDiningData>;
}
