import {Domain} from '../../../../kernel/domain/Domain';
import {ConsumptionItem} from '../value-object/ConsumptionItem';

export class Round {
    readonly id: string;
    readonly status: 'ACTIVE' | 'SUBMITTED';
    readonly items: Readonly<Record<string, number>>;

    constructor(snapshot: Round.Snapshot) {
        Domain.require(!!snapshot.id.trim() && ['ACTIVE', 'SUBMITTED'].includes(snapshot.status), 'INVALID_ROUND');
        Object.entries(snapshot.items).forEach(([id, q]) => new ConsumptionItem(id, q));
        this.id = Domain.copy(snapshot.id);
        this.status = Domain.copy(snapshot.status);
        this.items = Domain.copy(snapshot.items);
    }

    get snapshot(): Round.Snapshot {
        return Domain.copy({id: this.id, status: this.status, items: this.items});
    }

    isEmpty(): boolean {
        return !Object.keys(this.items).length;
    }

    canEdit(): boolean {
        return this.status === 'ACTIVE';
    }
}

export namespace Round {
    export type Snapshot = Readonly<{
        id: string;
        status: 'ACTIVE' | 'SUBMITTED';
        items: Readonly<Record<string, number>>;
    }>;
}
