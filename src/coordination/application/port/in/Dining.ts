import type {Accounting} from '../../../../contexts/accounting/application/port/in/Accounting';
import type {Catalog} from '../../../../contexts/catalog/application/port/in/Catalog';
import type {Collaboration} from '../../../../contexts/collaboration/application/port/in/Collaboration';

export namespace Dining {
    export type Session = Readonly<{
        scopeId: string;
        activityId: string;
        roomId: string | null;
    }>;
    export type Identity = Readonly<{
        id: string;
        nickname: string;
    }>;
    export type Result = Accounting.Result;
    export type Restaurant = Catalog.RestaurantView;
    export type Room = Collaboration.Room;
}
