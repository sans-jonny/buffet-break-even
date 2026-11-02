import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DiningScenario} from '../support/DiningScenario';
import {pageHarness} from '../helpers/pages.cjs';
import {RelaySpec} from '../event-store/RelaySpec';
import {RelayServer} from '../../server/src/transport/RelayServer';
import {RoomEventStore} from '../../server/src/event-store/RoomEventStore';
import {RestaurantRecord} from '../../protocol/RestaurantRecord';

export namespace CategoryDiningSpec {
    export function verify(): void {
        test('显式替换单人活动时，新建事件失败会回滚旧活动的放弃', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.startSingle(20000, 'My');
            const previous = meal.dining.session();
            meal.app.runtime.on('DiningStarted', async () => { throw new Error('CREATE_FAILED'); });
            await assert.rejects(meal.startSingle(30000, 'My', previous!.activityId), /CREATE_FAILED/);
            assert.deepEqual(meal.dining.session(), previous);
            assert.equal(meal.dining.activity()!.status, 'ACTIVE');
            assert.equal(meal.dining.activity()!.ticketPriceMinor, 20000);
            assert.deepEqual(meal.dining.unfinishedSingle(), previous);
        });

        test('新建单人活动不能把多人活动作为替换目标', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRoom();
            const previous = meal.dining.session();
            await assert.rejects(meal.startSingle(30000, 'My', previous!.activityId), /INVALID_SINGLE_REPLACEMENT/);
            assert.deepEqual(meal.dining.session(), previous);
            assert.equal(meal.dining.room()!.status, 'ACTIVE');
        });

        test('餐厅分类去重且名称来自 Catalog，单人活动只允许选中分类的餐厅', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRestaurant({id: 'second'});
            await meal.givenRestaurant({id: 'barbecue', type: 'PUBLIC', restaurantCategory: {id: 'BBQ', name: '炭火烧肉'}});
            assert.deepEqual(meal.dining.restaurantCategories(), [{id: 'My', name: '我的餐厅'}, {id: 'BBQ', name: '炭火烧肉'}]);
            await meal.startSingle(20000, 'My');
            assert.deepEqual(meal.dining.activity()!.restaurantIds, ['buffet', 'second']);
            assert.deepEqual(meal.dining.restaurants().map(r => r.id), ['buffet', 'second']);
            await assert.rejects(meal.dining.edit('barbecue', 'add', 'shrimp'), /RESTAURANT_NOT_IN_ACTIVITY/);
            assert.throws(() => meal.dining.preview('barbecue'), /RESTAURANT_NOT_IN_ACTIVITY/);
            await meal.whenEating();
            meal.thenValueIs(1500);
        });

        test('未知分类不能创建活动，私人原件的分类必须为 My', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await assert.rejects(meal.startSingle(20000, 'missing'), /RESTAURANT_CATEGORY_EMPTY/);
            await assert.rejects(meal.createRoom('room', '123456', 20000, 'missing'), /RESTAURANT_CATEGORY_EMPTY/);
            assert.equal(meal.dining.session(), undefined);
            assert.equal(meal.relay.sent, 0);
            await assert.rejects(meal.givenRestaurant({id: 'invalid', restaurantCategory: {id: 'BBQ', name: '烧肉'}}), /PRIVATE_RESTAURANT_CATEGORY_REQUIRED/);
        });

        test('多人只上传所选私人持久化记录，不通过 RestaurantPublished 复制；加入、更新、重建均可恢复', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRestaurant({id: 'second'});
            await host.givenRestaurant({id: 'public', type: 'PUBLIC', restaurantCategory: {id: 'BBQ', name: '烧肉'}});
            await host.initialize();
            const original = host.app.runtime.get('catalog/local/restaurant/buffet');
            await host.createRoom('room', '123456', 20000, 'My');
            assert.deepEqual(host.relay.catalogs.get('room')!.map(r => r.id), ['buffet', 'second']);
            assert.deepEqual(host.relay.catalogs.get('room')![0], original);
            assert.deepEqual(host.relay.streams.get('room')![0].events.map(e => e.type), ['RoomOpened', 'DiningStarted']);
            assert.deepEqual(host.dining.restaurants().map(r => r.id), ['room:buffet', 'room:second']);
            assert.deepEqual(host.dining.activity()!.restaurantIds, ['room:buffet', 'room:second']);
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room');
            await guest.whenEating(2, 'room:buffet', 'room:buffet:shrimp');
            guest.thenValueIs(3000, 'room:buffet');
            await host.givenRestaurant({version: 2, products: [{id: 'shrimp', name: '虾', categoryId: 'seafood', priceMinor: 2000}]});
            await guest.app.runtime.synchronize('room');
            guest.thenValueIs(4000, 'room:buffet');
            await guest.app.runtime.rebuild('room');
            guest.thenValueIs(4000, 'room:buffet');
            assert.equal(guest.dining.restaurants()[0].sourceVersion, 2);
            assert.equal(host.relay.catalogs.get('room')![0].version, 1);
        });

        test('选择公共分类不会上传设备内其他私人餐厅', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRestaurant({id: 'public', type: 'PUBLIC', restaurantCategory: {id: 'BBQ', name: '烧肉'}});
            await host.initialize();
            await host.createRoom('room', '123456', 20000, 'BBQ');
            assert.equal(host.relay.catalogs.has('room'), false);
            assert.deepEqual(host.dining.restaurants().map(r => r.id), ['public']);
            assert.deepEqual(host.dining.room()!.privateSourceIds, []);
        });

        test('setup 分类随 Catalog 更新，名称不写死，My 图标由页面映射', async t => {
            const app = pageHarness(), setup = app.setup('setup');
            t.after(setup.dispose);
            await setup.ready;
            assert.deepEqual(Array.from(setup.state.cuisineTypes.value, (c: {id: string}) => c.id), ['sukiyaki']);
            await app.services.dining.publishLocal(DiningScenario.restaurant());
            await app.services.dining.publishLocal(DiningScenario.restaurant({id: 'public', type: 'PUBLIC', restaurantCategory: {id: 'BBQ', name: '炭火烧肉'}}));
            const categories = setup.state.cuisineTypes.value;
            assert.equal(categories.find((c: {id: string}) => c.id === 'My').emoji, '👨‍🍳');
            assert.equal(categories.find((c: {id: string}) => c.id === 'BBQ').name, '炭火烧肉');
            setup.state.typeId.value = 'My';
            await setup.state.startSingle();
            assert.deepEqual(Array.from(app.services.dining.restaurants(), (r: {id: string}) => r.id), ['buffet']);
        });

        test('私人餐厅 HTTP 持久化接口往返原始对象，幂等上传且不产生领域事件', async () => {
            const fixture = await RelaySpec.database(), app = await RelayServer.create(fixture.db);
            try {
                const room = (await app.inject({method: 'POST', url: '/rooms'})).json();
                const url = `/rooms/${room.roomId}/private-restaurants`, records = [DiningScenario.restaurant()];
                assert.equal((await app.inject({method: 'POST', url, payload: {restaurants: records}})).statusCode, 204);
                assert.equal((await app.inject({method: 'POST', url, payload: {restaurants: records}})).statusCode, 204);
                assert.deepEqual((await app.inject({url})).json(), records);
                assert.equal(await fixture.db.roomEvent.count(), 0);
                assert.equal((await fixture.db.roomStream.findUniqueOrThrow({where: {roomId: room.roomId}})).version, 0);
                const store = new RoomEventStore.Store(fixture.db);
                await store.append(room.roomId, 0, [RelaySpec.opaque()]);
                assert.equal((await app.inject({method: 'POST', url, payload: {restaurants: records}})).statusCode, 204);
                assert.equal((await app.inject({method: 'POST', url, payload: {restaurants: [DiningScenario.restaurant({version: 2})]}})).statusCode, 400);
                await fixture.db.$disconnect();
                assert.deepEqual(await store.readRestaurants(room.roomId), records);
                assert.equal((await app.inject({url: '/rooms/missing/private-restaurants'})).statusCode, 404);
                assert.throws(() => RestaurantRecord.validate([{...records[0], type: 'PUBLIC'}]), /INVALID_RESTAURANT_RECORD/);
            } finally { await app.close(); await fixture.dispose(); }
        });
    }
}
