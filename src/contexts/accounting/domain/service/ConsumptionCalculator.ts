import {DiningResult} from '../value-object/DiningResult';
import {Domain} from '../../../../kernel/domain/Domain';
import {DiningActivity} from '../aggregate/DiningActivity';
import {RestaurantConsumption} from '../aggregate/RestaurantConsumption';
import {Money} from '../value-object/Money';

export namespace ConsumptionCalculator {
    export type Catalog = Readonly<{
        id: string;
        name: string;
        version: number;
        deleted: boolean;
        products: readonly {
            id: string;
            name: string;
            priceMinor: number;
        }[];
    }>;

    export function calculate(activity: DiningActivity.State,
                              consumption: RestaurantConsumption.State | undefined,
                              catalog: Catalog,
                              date: string,
                              diners: DiningResult.Snapshot['diners']): DiningResult.Snapshot {
        DiningActivity.reconstitute(activity).authorizeRestaurant(catalog.id);
        Domain.require(!catalog.deleted, 'RESTAURANT_UNAVAILABLE');
        Domain.require(!consumption || (consumption.activityId === activity.id && consumption.restaurantId === catalog.id), 'WRONG_CONSUMPTION');
        const quantities: Record<string, number> = {};
        consumption?.rounds.forEach(r => Object.entries(r.items).forEach(([id, quantity]) => {
            quantities[id] = (quantities[id] || 0) + quantity;
            Domain.require(Domain.positive(quantities[id]), 'QUANTITY_OVERFLOW');
        }));
        const lines = Object.entries(quantities).map(([productId, quantity]) => {
            const product = catalog.products.find(p => p.id === productId);
            Domain.require(product, 'CATALOG_RECONCILIATION_REQUIRED');
            Domain.require(Domain.minor(product.priceMinor), 'INVALID_PRODUCT_PRICE');
            return {productId, name: product.name, quantity, unitPriceMinor: product.priceMinor};
        });
        const foodValue = lines.reduce((sum,
                                        line) => sum.plus(Money.ofMinor(line.unitPriceMinor).times(line.quantity)), Money.ofMinor(0));
        const foodValueMinor = foodValue.minor,
            netMinor = foodValue.minus(Money.ofMinor(activity.ticketPriceMinor)).minor;
        return Domain.freeze({
            activityId: activity.id,
            restaurantId: catalog.id,
            restaurant: catalog.name,
            catalogVersion: catalog.version,
            date,
            ticketPriceMinor: activity.ticketPriceMinor,
            foodValueMinor,
            netMinor,
            percent: foodValueMinor / activity.ticketPriceMinor * 100,
            diners: Domain.copy(diners),
            lines,
            rounds: (consumption?.rounds || []).filter(r => Object.keys(r.items).length).map(r => ({
                id: r.id,
                lines: Object.entries(r.items).map(([productId, quantity]) => ({
                    ...lines.find(line => line.productId === productId)!,
                    quantity
                }))
            }))
        });
    }
}
