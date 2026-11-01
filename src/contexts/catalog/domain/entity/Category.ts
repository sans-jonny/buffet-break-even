import {Domain} from '../../../../kernel/domain/Domain';

export class Category {
    readonly id: string;
    readonly name: string;

    constructor(snapshot: Category.Snapshot) {
        Domain.require(!!snapshot.id.trim() && !!snapshot.name.trim(), 'INVALID_CATEGORY');
        this.id = Domain.copy(snapshot.id);
        this.name = Domain.copy(snapshot.name);
    }

    get snapshot(): Category.Snapshot {
        return Domain.copy({id: this.id, name: this.name});
    }
}

export namespace Category {
    export type Snapshot = Readonly<{
        id: string;
        name: string;
    }>;
}
