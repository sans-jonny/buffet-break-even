import {DomainScenario} from '../support/DomainScenario'
import {SerializedEvent} from '../../src/kernel/application/SerializedEvent'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DiningScenario} from '../support/DiningScenario'
import {DiningRoom} from '../../src/contexts/collaboration/domain/aggregate/DiningRoom'
import {Domain} from '../../src/kernel/domain/Domain'
import {IncreaseDiningProductUseCase} from '../../src/coordination/application/port/in/dining/IncreaseDiningProductUseCase'
import {SessionStore} from '../../src/stores/business/SessionStore'

export namespace CollaborationSpec {
    export function verify(): void {
        test('空房普通成员和房主退出菜单都只离房，保留整桌供重新加入', async t => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            t.after(host.app.dispose);
            await host.givenRoom();
            const guest = new DiningScenario.Meal(host.relay, 'empty-guest');
            t.after(guest.app.dispose);
            await guest.initialize();
            await guest.joinRoom('room');
            const guests = SessionStore.create(guest.app, guest.app.queries, guest.app.pinia);
            const hosts = SessionStore.create(host.app, host.app.queries, host.app.pinia);
            t.after(() => { guests.$dispose(); hosts.$dispose(); });
            await guests.exitMenu();
            await host.app.runtime.synchronize('room');
            assert.equal(host.dining.room()!.status, 'ACTIVE');
            assert.equal(guest.dining.session(), undefined);
            await hosts.exitMenu();
            assert.equal(host.app.collaboration.findRoom('room')!.status, 'ACTIVE');
            assert.equal(host.dining.session(), undefined);
        });
        test('昵称变化提交成员事件并同步到多个房间；重复保存不重复发事件，结束后的历史保持原名', async t => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            t.after(host.app.dispose);
            await host.givenRoom();
            const guest = new DiningScenario.Meal(host.relay, 'nickname-guest');
            t.after(guest.app.dispose);
            await guest.initialize();
            await guest.joinRoom('room');
            await host.createRoom('other', '654321', 20000);
            await host.app.personal.nickname('新昵称');
            const name = (room: import('../../src/coordination/application/dto/Dining').Dining.Room | undefined) => room!.members.find(m => m.id === host.dining.identity().id)!.nickname;
            await guest.app.runtime.synchronize('room');
            assert.equal(name(guest.app.collaboration.findRoom('room')), '新昵称');
            assert.equal(name(host.app.collaboration.findRoom('other')), '新昵称');
            const sent = host.relay.sent;
            await host.app.personal.nickname('新昵称');
            assert.equal(host.relay.sent, sent);
            await host.dining.finish('other:buffet');
            await host.app.personal.nickname('再次改名');
            assert.equal(host.app.personal.history()[0].diners[0].nickname, '新昵称');
            await guest.app.runtime.synchronize('room');
            assert.equal(name(guest.app.collaboration.findRoom('room')), '再次改名');
        });
        test('共用授权入口拒绝普通成员的房主操作和错配活动，不提交候选事件', async t => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            t.after(host.app.dispose);
            await host.givenRoom();
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            t.after(guest.app.dispose);
            await guest.initialize();
            await guest.joinRoom('room');
            const sent = host.relay.sent;
            await assert.rejects(guest.dining.paying(10000), /HOST_REQUIRED/);
            await assert.rejects(guest.dining.finish('room:buffet'), /HOST_REQUIRED/);
            await assert.rejects(guest.dining.abandon(), /HOST_REQUIRED/);
            await assert.rejects(guest.app.collaboration.transfer(host.dining.identity().id), /HOST_REQUIRED/);
            const session = {...guest.dining.session()!, activityId: 'another-activity'};
            await assert.rejects(guest.app.resolve(IncreaseDiningProductUseCase.token).execute(
                new IncreaseDiningProductUseCase.Request(session, guest.dining.identity().id, 'room:buffet', 'room:buffet:shrimp', 1)
            ), /ROOM_ACTIVITY_MISMATCH/);
            assert.equal(host.relay.sent, sent);
        });
        test('多人共用总门票；新成员从零回放，普通成员可加量但不能提交', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRoom()
            await host.whenEating(2, 'room:buffet', 'room:buffet:shrimp')
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room')
            guest.thenValueIs(3000, 'room:buffet')
            assert.equal(guest.dining.activity()!.ticketPriceMinor, 20000)
            await assert.rejects(guest.dining.submit('room:buffet'), /HOST_REQUIRED/)
            await guest.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
            await host.app.runtime.synchronize('room');
            host.thenQuantityIs(3, 'room:buffet', 'room:buffet:shrimp')
            for (const prefix of ['accounting/', 'catalog/room/', 'collaboration/']) {
                assert.equal(JSON.stringify(host.app.runtime.entries(prefix)), JSON.stringify(guest.app.runtime.entries(prefix)))
            }
        })
        test('409 后重新执行原始命令，减少不足时拒绝而非重标旧事实', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRoom();
            await host.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room')
            host.relay.beforeAppend = async () => {
                await guest.dining.edit('room:buffet', 'reduce', 'room:buffet:shrimp')
            }
            await assert.rejects(host.dining.edit('room:buffet', 'reduce', 'room:buffet:shrimp'), /INSUFFICIENT_QUANTITY/)
            host.thenQuantityIs(0, 'room:buffet', 'room:buffet:shrimp')
        })
        test('响应丢失进入 UNKNOWN，不自动重复加量；确认歧义前禁止写命令', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRoom()
            meal.relay.loseResponse = true
            await assert.rejects(meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp'), /UNKNOWN_COMMIT_OUTCOME/)
            const sent = meal.relay.sent
            await assert.rejects(meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp'), /UNKNOWN_COMMIT_OUTCOME/)
            assert.equal(meal.relay.sent, sent)
            await meal.app.runtime.synchronize('room')
            assert.equal(meal.app.runtime.sync.get('room'), 'UNKNOWN')
            const restarted = new DiningScenario.Meal(meal.relay, 'restart')
            for (const [key, value] of meal.storage.values) restarted.storage.values.set(key, value)
            await assert.rejects(restarted.whenEating(1, 'room:buffet', 'room:buffet:shrimp'), /UNKNOWN_COMMIT_OUTCOME/)
            await meal.app.runtime.acknowledgeUnknown('room')
            meal.thenQuantityIs(1, 'room:buffet', 'room:buffet:shrimp')
        })
        test('房主退出自动交给最早在线成员；重入重新排序；主动转让不改顺序', () => {
            let state = DomainScenario.room(DiningRoom.create('r', '123456', 'a', 'a', 'A', []))
            const decide = (decision: DiningRoom.Event | import('../../src/contexts/collaboration/domain/rejection/DiningRoomRejected').DiningRoomRejected) => {
                state = DomainScenario.room(Domain.accepted(decision), state)
            }
            decide(DiningRoom.reconstitute(state).join('b','B','2026-11-01T00:00:00Z'))
            decide(DiningRoom.reconstitute(state).join('c','C','2026-11-01T00:00:00Z'))
            decide(DiningRoom.reconstitute(state).transferHost('a', 'c'))
            assert.deepEqual(state.members.map(m => m.order), [1, 2, 3])
            decide(DiningRoom.reconstitute(state).leave('c', '2026-11-01T00:00:00Z'))
            assert.equal(state.hostId, 'a')
            decide(DiningRoom.reconstitute(state).leave('a', '2026-11-01T00:00:00Z'))
            assert.equal(state.hostId, 'b')
            decide(DiningRoom.reconstitute(state).join('a','A','2026-11-01T00:00:00Z'))
            assert.equal(state.members.find(m => m.id === 'a')!.order, 4)
            decide(DiningRoom.reconstitute(state).leave('b', '2026-11-01T00:00:00Z'))
            decide(DiningRoom.reconstitute(state).leave('a', '2026-11-01T00:00:00Z'))
            assert.equal(state.hostId, null);
            assert.ok(state.emptySince)
        })
        test('完成只冻结仍在房间且在线的成员；已退出者不能补领历史', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRoom()
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room');
            await guest.leave()
            await host.dining.finish('room:buffet')
            assert.deepEqual(host.app.personal.history()[0].diners.map(d => d.id), [host.dining.identity().id])
            await assert.rejects(guest.joinRoom('room'), /NOT_ELIGIBLE/)
            await assert.rejects(host.dining.finish('room:buffet'), /ALREADY_ENDED/)
        })
        test('私人身份集合固定，副本重新标识；只有原创建者可同步完整最新版本', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRoom()
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room')
            const original = DiningScenario.restaurant({version: 2, products: []})
            await assert.rejects(guest.app.collaboration.synchronizePrivate(original), /CREATOR_SOURCE_REQUIRED/)
            await host.whenEating(2, 'room:buffet', 'room:buffet:shrimp');
            await host.app.collaboration.synchronizePrivate(original)
            host.thenQuantityIs(0, 'room:buffet', 'room:buffet:shrimp')
            await assert.rejects(host.app.collaboration.synchronizePrivate(original), /STALE_CATALOG_VERSION/)
            assert.deepEqual(host.dining.room()!.privateSourceIds, ['buffet'])
        })
        test('单人与多人可同时存在且消费记录隔离', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle();
            await meal.whenEating(3)
            const single = meal.dining.session()!
            await meal.givenRoom();
            await meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
            await meal.selectSession(single);
            meal.thenQuantityIs(3)
        })
        test('在线成员自动领取冻结历史，删除后重建不重现；显式补存可以恢复', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRoom()
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room')
            await host.dining.finish('room:buffet');
            await guest.app.runtime.synchronize('room')
            assert.equal(guest.app.personal.history().length, 1)
            const activityId = guest.dining.activity()!.id
            await guest.app.personal.deleteHistory(activityId);
            await guest.app.runtime.rebuild('room')
            assert.equal(guest.app.personal.history().length, 0)
            await guest.app.personal.saveHistory(guest.dining.session(), guest.dining.activity()?.result);
            assert.equal(guest.app.personal.history().length, 1)
            assert.equal(guest.app.personal.history()[0].ticketPriceMinor, 20000)
        })
        test('公共目录新增和调价进入现有房间完整事件链，新设备可回放相同价格', async () => {
            const host = await new DiningScenario.Meal().givenRestaurant();
            await host.givenRoom()
            await host.givenRestaurant({id: 'public', type: 'PUBLIC'})
            await host.whenEating(2, 'public')
            await host.givenRestaurant({
                id: 'public',
                type: 'PUBLIC',
                version: 2,
                products: [{id: 'shrimp', name: '虾', categoryId: 'seafood', priceMinor: 2000}]
            })
            host.thenValueIs(4000, 'public')
            const guest = new DiningScenario.Meal(host.relay, 'guest');
            await guest.initialize();
            await guest.joinRoom('room')
            guest.thenValueIs(4000, 'public')
        })
    }
}
