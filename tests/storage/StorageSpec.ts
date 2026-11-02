import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DiningScenario} from '../support/DiningScenario'
import {ManifestStorage} from '../../src/infrastructure/storage/ManifestStorage'

export namespace StorageSpec {
    export function verify(): void {
        for (const failure of ['data', 'manifest', 'head']) test(`Storage ${failure} 写入失败只暴露旧完整发布头`, async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle();
            await meal.whenEating()
            const before = meal.storage.get('app:head')
            meal.storage.fail = key => failure === 'head' ? key === 'app:head' : key.startsWith(`app:${failure}:`)
            await assert.rejects(meal.whenEating(), /DISK_FULL/)
            meal.storage.fail = undefined
            meal.thenQuantityIs(1);
            assert.equal(meal.storage.get('app:head'), before)
            await meal.whenEating();
            meal.thenQuantityIs(2)
        })
        test('损坏数据不被当作已提交；孤儿准备代不会被自动提升', () => {
            const storage = new DiningScenario.Storage();
            let id = 0
            const store = new ManifestStorage.Store(storage, () => String(++id))
            store.publish({one: 1});
            store.publish({one: 2, two: 3})
            const head = storage.get('app:head')!
            const envelope = JSON.parse(storage.get(`app:manifest:${head}`)!)
            const manifest = JSON.parse(envelope.data)
            storage.remove(manifest.entries.two.key)
            assert.throws(() => store.read(), /RECOVERY_REQUIRED/)
            store.recoverPrevious();
            assert.deepEqual(store.read(), {one: 1})
        })
        test('head 已写入且可验证时不把成功误报为失败；垃圾回收保留上一个可信代', () => {
            const storage = new DiningScenario.Storage();
            let id = 0
            const store = new ManifestStorage.Store(storage, () => String(++id))
            store.publish({one: 1})
            const set = storage.set.bind(storage)
            storage.set = (key, value) => {
                set(key, value);
                if (key === 'app:head') throw new Error('LATE_ADAPTER_ERROR')
            }
            store.publish({one: 2});
            assert.deepEqual(store.read(), {one: 2})
            storage.set = set
            store.publish({one: 3});
            store.publish({one: 4})
            assert.equal(storage.keys().filter(k => k.startsWith('app:manifest:')).length, 2)
            store.recoverPrevious();
            assert.deepEqual(store.read(), {one: 3})
        })
        test('远程已成功本地失败保持日志，完整重放修复且个人数据保留', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRoom()
            const sent = meal.relay.sent
            meal.relay.beforeAppend = async () => {
                meal.storage.fail = key => key.startsWith('app:data:')
            }
            await assert.rejects(meal.whenEating(2, 'room:buffet', 'room:buffet:shrimp'), /SYNC_PENDING/)
            assert.equal(meal.relay.sent, sent + 1)
            meal.storage.fail = undefined
            await meal.app.runtime.synchronize('room');
            meal.thenQuantityIs(2, 'room:buffet', 'room:buffet:shrimp')
            assert.ok(meal.dining.identity());
            assert.ok(meal.app.runtime.get('catalog/local/restaurant/buffet'))
        })
        test('房间完整重建隔离发布，保留个人小票、历史和私人原件', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle();
            await meal.dining.finish('buffet')
            await meal.app.personal.saveReceipt(meal.dining.preview('buffet'));
            await meal.givenRoom();
            await meal.whenEating(3, 'room:buffet', 'room:buffet:shrimp')
            const personal = JSON.stringify({
                receipt: meal.app.personal.receipt(),
                history: meal.app.personal.history(),
                identity: meal.dining.identity()
            })
            await meal.app.runtime.local(state => {
                state['cursor/room'] = 999
            })
            await meal.app.runtime.rebuild('room');
            meal.thenQuantityIs(3, 'room:buffet', 'room:buffet:shrimp')
            assert.equal(JSON.stringify({
                receipt: meal.app.personal.receipt(),
                history: meal.app.personal.history(),
                identity: meal.dining.identity()
            }), personal)
            assert.ok(meal.app.catalog.restaurant('buffet', true))
        })
    }
}
