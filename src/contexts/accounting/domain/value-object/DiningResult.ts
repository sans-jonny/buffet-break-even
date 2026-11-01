import {Domain} from '../../../../kernel/domain/Domain';

export class DiningResult {
    readonly activityId: DiningResult.Snapshot['activityId'];
    readonly restaurantId: DiningResult.Snapshot['restaurantId'];
    readonly restaurant: DiningResult.Snapshot['restaurant'];
    readonly catalogVersion: DiningResult.Snapshot['catalogVersion'];
    readonly date: DiningResult.Snapshot['date'];
    readonly ticketPriceMinor: DiningResult.Snapshot['ticketPriceMinor'];
    readonly foodValueMinor: DiningResult.Snapshot['foodValueMinor'];
    readonly netMinor: DiningResult.Snapshot['netMinor'];
    readonly percent: DiningResult.Snapshot['percent'];
    readonly diners: DiningResult.Snapshot['diners'];
    readonly lines: DiningResult.Snapshot['lines'];
    readonly rounds: DiningResult.Snapshot['rounds'];

    private constructor(snapshot: DiningResult.Snapshot) {
        this.activityId = Domain.copy(snapshot.activityId);
        this.restaurantId = Domain.copy(snapshot.restaurantId);
        this.restaurant = Domain.copy(snapshot.restaurant);
        this.catalogVersion = Domain.copy(snapshot.catalogVersion);
        this.date = Domain.copy(snapshot.date);
        this.ticketPriceMinor = Domain.copy(snapshot.ticketPriceMinor);
        this.foodValueMinor = Domain.copy(snapshot.foodValueMinor);
        this.netMinor = Domain.copy(snapshot.netMinor);
        this.percent = Domain.copy(snapshot.percent);
        this.diners = Domain.copy(snapshot.diners);
        this.lines = Domain.copy(snapshot.lines);
        this.rounds = Domain.copy(snapshot.rounds);
    }

    get snapshot(): DiningResult.Snapshot {
        return Domain.copy({
            activityId: this.activityId,
            restaurantId: this.restaurantId,
            restaurant: this.restaurant,
            catalogVersion: this.catalogVersion,
            date: this.date,
            ticketPriceMinor: this.ticketPriceMinor,
            foodValueMinor: this.foodValueMinor,
            netMinor: this.netMinor,
            percent: this.percent,
            diners: this.diners,
            lines: this.lines,
            rounds: this.rounds
        });
    }

    static create(snapshot: DiningResult.Snapshot): DiningResult {
        Domain.require(!!snapshot.restaurantId && Domain.positive(snapshot.ticketPriceMinor) && Domain.minor(snapshot.foodValueMinor), 'INVALID_RESULT');
        Domain.require(snapshot.netMinor === snapshot.foodValueMinor - snapshot.ticketPriceMinor, 'INCONSISTENT_RESULT');
        Domain.require(snapshot.lines.every(l => Domain.positive(l.quantity) && Domain.minor(l.unitPriceMinor)), 'INVALID_RESULT_LINE');
        Domain.require(snapshot.lines.reduce((sum,
                                              l) => sum + l.quantity * l.unitPriceMinor, 0) === snapshot.foodValueMinor, 'INCONSISTENT_RESULT');
        return new DiningResult(snapshot);
    }
}

export namespace DiningResult {
    export type Snapshot = Readonly<{
        activityId: string;
        restaurantId: string;
        restaurant: string;
        catalogVersion: number;
        date: string;
        ticketPriceMinor: number;
        foodValueMinor: number;
        netMinor: number;
        percent: number;
        diners: readonly {
            id: string;
            nickname: string;
        }[];
        lines: readonly {
            productId: string;
            name: string;
            quantity: number;
            unitPriceMinor: number;
        }[];
        rounds: readonly {
            id: string;
            lines: readonly {
                productId: string;
                name: string;
                quantity: number;
                unitPriceMinor: number;
            }[];
        }[];
    }>;
}
