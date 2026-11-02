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

    receipt() {
        return UseCase.dto(this.storage.get<Dining.Result>('personal/receipt'));
    }

    history() {
        return UseCase.dto(this.storage.entries<Dining.Result>('personal/history/').slice().sort((a,
                                                                                                  b) => b.date.localeCompare(a.date)));
    }

    async initialize(id: string, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            if (!s['personal/identity'])
                s['personal/identity'] = {id, nickname: '饭搭子'};
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
            s['personal/receipt'] = result;
        }
    }

    async saveHistory(session: Dining.Session, result: Dining.Result, tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
            s[`personal/history/${session.scopeId}/${session.activityId}`] = result;
            delete s[`personal/history-deleted/${session.scopeId}/${session.activityId}`];
        }
    }

    async deleteReceipt(tx: Transaction.Context) {
        const s = this.local.state(tx);
        {
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
