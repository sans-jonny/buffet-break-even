import {Domain} from './Domain';

export abstract class AggregateRoot<T extends {
    readonly id: string;
    readonly version: number;
}> {
    readonly id: string;
    readonly version: number;

    protected constructor(id: string, version: number) {
        Domain.require(!!id.trim() && Domain.positive(version), 'INVALID_AGGREGATE_SNAPSHOT');
        this.id = id;
        this.version = version;
    }

    abstract snapshot(): T;
}
