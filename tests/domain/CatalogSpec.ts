import {DomainScenario} from '../support/DomainScenario'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Restaurant} from '../../src/contexts/catalog/domain/aggregate/Restaurant'
import {Money} from '../../src/contexts/catalog/domain/value-object/Money'
import {Domain} from '../../src/kernel/domain/Domain'
import {DiningScenario} from '../support/DiningScenario'

export namespace CatalogSpec {
    export function verify(): void {
        test('目录 DSL：修改价格与删除分类产生完整版本，原对象保持不变', () => {
            const original = DiningScenario.restaurant(), model = Restaurant.reconstitute(original)
            const price = Money.pricedAt(1500).changingTo(2000)
            const changed = DomainScenario.restaurant(Domain.accepted(model.replaceProducts([{
                ...original.products[0],
                priceMinor: price.minor
            }])), original)
            assert.equal(changed.version, 2);
            assert.equal(changed.products[0].priceMinor, 2000)
            assert.equal(original.products[0].priceMinor, 1500)
            const removed = DomainScenario.restaurant(Domain.accepted(Restaurant.reconstitute(changed).deleteCategory('seafood')), changed)
            assert.deepEqual(removed.categories, []);
            assert.deepEqual(removed.products, [])
            assert.throws(() => Money.pricedAt(-1), /INVALID_PRODUCT_PRICE/)
        })
        test('房间副本稳定映射原件 ID，完整同步包含删除且拒绝过期版本', () => {
            const original = DiningScenario.restaurant()
            const copy = DomainScenario.restaurant(Domain.accepted(Restaurant.reconstitute(original).copyIntoRoom('room')))
            assert.equal(copy.id, 'room:buffet');
            assert.equal(copy.products[0].id, 'room:buffet:shrimp')
            const updated = DomainScenario.restaurant(Domain.accepted(Restaurant.reconstitute(copy).synchronizeFrom({
                ...original,
                version: 2,
                products: []
            }, 'room')), copy)
            assert.equal(updated.id, copy.id);
            assert.equal(updated.sourceVersion, 2);
            assert.deepEqual(updated.products, [])
            assert.deepEqual({...Restaurant.reconstitute(updated).synchronizeFrom(original, 'room')}, {rejected: 'STALE_CATALOG_VERSION'})
        })
        test('公共目录的删除事实同步到房间，完整回放后仍不可选择或消费', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant({type: 'PUBLIC'});
            await host.givenRoom(); await host.whenEating();
            await host.givenRestaurant({type: 'PUBLIC', version: 2, deleted: true});
            assert.equal(host.dining.restaurants().some(r => r.id === 'buffet'), false);
            assert.equal(host.dining.consumption('buffet'), undefined);
            const peer = new DiningScenario.Meal(host.relay, 'peer');
            await peer.initialize(); await peer.joinRoom('room');
            assert.equal(peer.dining.restaurants().some(r => r.id === 'buffet'), false);
            await assert.rejects(peer.whenEating(), /RESTAURANT_UNAVAILABLE/);
        });
        test('目录按稳定身份区分同名公共与私人餐厅，重复产品 ID 拒绝', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant()
            await meal.givenRestaurant({id: 'public', type: 'PUBLIC'})
            assert.deepEqual(meal.dining.localRestaurants().map(r => r.name), ['同名餐厅', '同名餐厅'])
            const original = DiningScenario.restaurant()
            assert.deepEqual({...Restaurant.publish({
                ...original,
                products: [original.products[0], original.products[0]]
            })}, {rejected: 'DUPLICATE_CATALOG_ID'})
        })
    }
}
