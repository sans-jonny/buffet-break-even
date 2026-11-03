import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class TicketPriceChanged extends DomainEvent<TicketPriceChanged.Facts> {
    readonly type = 'TicketPriceChanged' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: TicketPriceChanged.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace TicketPriceChanged {
    export type Facts = Readonly<{
        ticketPriceMinor: number;
    }>;
}
