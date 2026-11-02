import {LocalDataTransactionRunner} from './LocalDataTransactionRunner';
import {LocalDiningData} from '../../coordination/application/port/out/device/LocalDiningData';
import {Dining} from '../../coordination/application/dto/Dining';
import {Transaction} from '../../kernel/application/Transaction';
import {UseCase} from '../../kernel/application/UseCase';

export class StorageLocalDiningData implements LocalDiningData {
    constructor(private readonly storage: Transaction.Runner, private readonly local: LocalDataTransactionRunner) {
    }

    identity() {
        return UseCase.dto(this.storage.get<Dining.Identity>('personal/identity'));
    }

    session() {
        return UseCase.dto(this.storage.get<Dining.Session>('personal/session'));
    }

    receipts() {
        const receipts = this.storage.entries<Dining.Result>('personal/receipts/').slice();
        const previous = this.storage.get<Dining.Result>('personal/receipt');
        if (previous && !receipts.some(receipt => receipt.activityId === previous.activityId)) receipts.push(previous);
        return UseCase.dto(receipts.sort((a, b) => b.date.localeCompare(a.date) || a.activityId.localeCompare(b.activityId)));
    }

    history() {
        return UseCase.dto(this.storage.entries<Dining.Result>('personal/history/').slice().sort((a,
                                                                                                  b) => b.date.localeCompare(a.date)));
    }

    async initialize(id: string, nickname: string, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            if (!s['personal/identity'])
                s['personal/identity'] = {id, nickname};
        }
    }

    async changeNickname(nickname: string, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            s['personal/identity'] = {...this.identity(), nickname};
        }
    }

    async selectSession(session: Dining.Session, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            s['personal/session'] = session;
            if (session.roomId)
                s['personal/last-room'] = session.roomId;
            else
                s['personal/single'] = session;
        }
    }

    async clearSession(tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            delete s['personal/session'];
        }
    }

    async saveReceipt(result: Dining.Result, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            const previous = s['personal/receipt'] as Dining.Result | undefined;
            if (previous && !s[`personal/receipts/${previous.activityId}`])
                s[`personal/receipts/${previous.activityId}`] = previous;
            s[`personal/receipts/${result.activityId}`] = result;
            delete s['personal/receipt'];
        }
    }

    async saveHistory(session: Dining.Session, result: Dining.Result, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            s[`personal/history/${session.scopeId}/${session.activityId}`] = result;
            delete s[`personal/history-deleted/${session.scopeId}/${session.activityId}`];
        }
    }

    async deleteReceipt(activityId: string, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            delete s[`personal/receipts/${activityId}`];
            if ((s['personal/receipt'] as Dining.Result | undefined)?.activityId === activityId)
                delete s['personal/receipt'];
        }
    }

    async deleteHistory(activityId: string, tx: Transaction.Context) {
        const s = this.local.state(tx);
        Object.keys(s).filter(k => k.startsWith('personal/history/') && k.endsWith('/' + activityId)).forEach(k => {
            s[k.replace('personal/history/', 'personal/history-deleted/')] = true;
            delete s[k];
        });
    }
}
