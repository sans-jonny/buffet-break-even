import {test} from 'node:test'
import assert from 'node:assert/strict'
import {pageHarness} from '../helpers/pages.cjs'

/** Exercise real SFC actions against the production domain and isolated Storage. */
export namespace UiFlowSpec {
    export function verify(): void {
        test('未点餐退出菜单自动放弃；空活动轮次也不会留下未完成用餐', async t => {
            const app = pageHarness();
            await app.ready;
            await app.services.sessionStore.startSingle(10000, 'sukiyaki');
            const id = app.services.dining.session()!.activityId;
            const menu = app.setup('menu');
            t.after(menu.dispose);
            await menu.ready;
            await menu.state.addItem('beef');
            await menu.state.removeItem('beef');
            await menu.state.goBack();
            assert.equal(app.services.dining.session(), undefined);
            assert.equal(app.services.queries.activities().find((a: {id: string}) => a.id === id)!.status, 'ABANDONED');
            assert.equal(app.services.personal.history().length, 0);
        });
        test('点单返回菜单不展开购物车，已提交轮次的用餐退出后继续保留', async t => {
            const app = pageHarness();
            await app.ready;
            await app.services.sessionStore.startSingle(10000, 'sukiyaki');
            const menu = app.setup('menu');
            t.after(menu.dispose);
            await menu.ready;
            await menu.state.addItem('beef');
            menu.state.showCart.value = true;
            await menu.state.openOrderSlip();
            assert.equal(menu.state.showCart.value, false);
            const order = app.setup('order-slip');
            t.after(order.dispose);
            await order.ready;
            await order.state.completeRound();
            assert.equal(menu.state.showCart.value, false);
            await menu.state.goBack();
            assert.equal(app.services.dining.activity()!.status, 'ACTIVE');
        });
        test('当前查看的餐厅直接成为今日战果及保存小票的餐厅', async t => {
            const app = pageHarness();
            await app.ready;
            await app.services.sessionStore.startSingle(10000, 'sukiyaki');
            const menu = app.setup('menu');
            t.after(menu.dispose);
            await menu.ready;
            const restaurant = menu.state.restaurants.value[1];
            assert.ok(restaurant);
            menu.state.selectRestaurant(restaurant.id);
            await menu.state.finish();
            const result = app.setup('result');
            t.after(result.dispose);
            await result.ready;
            assert.equal(result.state.finalRestaurantId.value, restaurant.id);
            await result.state.save();
            assert.equal(app.services.personal.receipt()!.restaurant, restaurant.name);
            result.state.endDining();
            await result.state.confirmation.confirm();
            assert.equal(app.services.dining.activity()!.result!.restaurant, restaurant.name);
        });
        test('setup 先提示继续旧单人活动，跨分类恢复原记录，不解析新票价', async t => {
            const app = pageHarness(), setup = app.setup('setup');
            t.after(setup.dispose);
            await setup.ready;
            await app.services.sessionStore.startSingle(18000, 'sukiyaki');
            await app.services.dining.edit('niuniu', 'add', 'beef', 2);
            const previous = app.services.dining.session();
            await app.services.sessionStore.resumeSingle({scopeId: 'other', activityId: 'other', roomId: null});
            setup.state.ticketInput.value = 'invalid';
            await setup.state.startSingle();
            assert.equal(setup.state.confirmation.dialog.value.confirmText, '继续用餐');
            assert.equal(app.calls.length, 0);
            assert.equal(app.services.dining.session().activityId, 'other');
            await setup.state.startSingle();
            await setup.state.confirmation.confirm();
            await setup.state.confirmation.confirm();
            assert.deepEqual(app.services.dining.session(), previous);
            assert.equal(app.services.dining.activity().ticketPriceMinor, 18000);
            assert.equal(app.services.dining.consumption('niuniu').rounds[0].items.beef, 2);
            assert.deepEqual(app.calls, [['open', 'menu']]);
        });

        test('setup 显式选择新建后放弃旧活动，使用新票价和当前分类', async t => {
            const app = pageHarness(), setup = app.setup('setup');
            t.after(setup.dispose);
            await setup.ready;
            await app.services.sessionStore.startSingle(18000, 'sukiyaki');
            const previous = app.services.dining.session();
            await app.services.catalog.publish({
                id: 'mine', name: '自定义餐厅', type: 'PRIVATE', version: 1, deleted: false,
                restaurantCategory: {id: 'My', name: '我的餐厅'}, categories: [], products: []
            });
            setup.state.typeId.value = 'My';
            setup.state.ticketInput.value = '250.50';
            await setup.state.startSingle();
            assert.equal(app.services.dining.activity().status, 'ACTIVE');
            assert.equal(app.services.dining.session().activityId, previous.activityId);
            await setup.state.confirmation.cancel();
            const current = app.services.dining.session();
            assert.notEqual(current.activityId, previous.activityId);
            assert.equal(app.services.dining.activity().ticketPriceMinor, 25050);
            assert.equal(app.services.dining.activity().restaurantCategoryId, 'My');
            assert.deepEqual(Array.from(app.services.dining.restaurants(), (r: {id: string}) => r.id), ['mine']);
            assert.equal(app.services.personal.history().length, 0);
            await app.services.sessionStore.resumeSingle(previous);
            assert.equal(app.services.dining.activity().status, 'ABANDONED');
            await app.services.sessionStore.resumeSingle(current);
            assert.deepEqual(app.calls, [['open', 'menu']]);
        });

        test('关闭继续提示或新票价无效时保留原活动，不进入菜单', async t => {
            const app = pageHarness(), setup = app.setup('setup');
            t.after(setup.dispose);
            await setup.ready;
            await app.services.sessionStore.startSingle(18000, 'sukiyaki');
            const previous = app.services.dining.session();
            await setup.state.startSingle();
            setup.state.confirmation.close();
            assert.deepEqual(app.services.dining.session(), previous);
            setup.state.ticketInput.value = 'invalid';
            await setup.state.startSingle();
            await assert.rejects(setup.state.confirmation.cancel(), /请输入最多两位小数的金额/);
            assert.equal(app.services.dining.activity().status, 'ACTIVE');
            assert.deepEqual(app.services.dining.session(), previous);
            assert.equal(setup.state.startingSingle.value, false);
            assert.equal(app.calls.length, 0);
        });

        test('准备 → 加菜 → 提交本轮 → 按当前餐厅结算 → 本地历史和小票', async t => {
            const app = pageHarness()
            const setup = app.setup('setup');
            t.after(setup.dispose);
            await setup.ready
            setup.state.ticketInput.value = '200.25';
            await setup.state.startSingle()
            assert.equal(app.services.dining.activity().ticketPriceMinor, 20025)
            const menu = app.setup('menu');
            t.after(menu.dispose);
            await menu.ready
            assert.equal(menu.state.totalSelectedCount.value, 0)
            await menu.state.addItem('beef');
            await menu.state.addItem('beef')
            assert.equal(menu.state.displayValue.value, 20)
            menu.state.editPrice();
            menu.state.priceInput.value = '180.12';
            await menu.state.savePrice()
            assert.equal(menu.state.ticketPrice.value, 180.12)
            const order = app.setup('order-slip');
            t.after(order.dispose);
            await order.ready
            await order.state.completeRound()
            assert.equal(app.services.dining.consumption('niuniu').rounds.length, 2)
            await menu.state.finish()
            const result = app.setup('result');
            t.after(result.dispose);
            await result.ready
            await result.state.save();
            assert.equal(app.services.personal.receipt().foodValueMinor, 2000)
            assert.equal(result.state.finalRestaurantId.value, 'niuniu')
            const navigationCount = app.calls.length
            result.state.endDining();
            assert.ok(result.state.confirmation.dialog.value.content.includes('牛牛'))
            await result.state.confirmation.confirm()
            assert.equal(app.services.personal.history().length, 1);
            assert.equal(app.services.dining.activity().status, 'ENDED')
            assert.equal(app.calls.length, navigationCount)
            assert.equal(result.state.secondaryAction.value.label, '返回首页')
            await result.state.secondaryAction.value.run()
            assert.deepEqual(app.calls[app.calls.length - 1], ['open', 'setup', 'reset'])
        })
        test('私人目录创建与级联删除保存真实版本；离开提示保留', async t => {
            const app = pageHarness(), editor = app.setup('custom-menu');
            t.after(editor.dispose);
            await editor.ready
            const s = editor.state
            s.restaurant.value.name = '我的餐厅';
            s.editCategory();
            s.form.value.name = '海鲜';
            s.applyForm()
            const categoryId = s.restaurant.value.categories[0].id
            s.editProduct();
            s.form.value.name = '龙虾';
            s.form.value.price = '35.18';
            s.applyForm()
            assert.equal(s.restaurant.value.products[0].price, 35.18)
            await s.saveAll();
            assert.equal(app.services.catalog.restaurant(s.restaurant.value.id, true).version, 1)
            s.removeCategory(categoryId);
            await s.saveAll()
            assert.equal(app.services.catalog.restaurant(s.restaurant.value.id, true).products.length, 0)
            s.isDirty.value = true;
            s.goBack();
            assert.equal(s.showLeaveDialog.value, true)
            await s.discardAndLeave();
            assert.deepEqual(app.calls[app.calls.length - 1], ['back', 'creator'])
        })
        test('真实昵称、统计、历史删除和每人一张小票', async t => {
            const app = pageHarness();
            await app.ready;
            await app.services.sessionStore.startSingle(10000, 'sukiyaki')
            await app.services.dining.edit('niuniu', 'add', 'beef', 12)
            await app.services.personal.saveReceipt(app.services.dining.preview('niuniu'));
            await app.services.dining.finish('niuniu')
            const mine = app.setup('mine');
            t.after(mine.dispose);
            await mine.ready
            mine.state.editNickname();
            mine.state.nicknameInput.value = '小羊';
            await mine.state.saveNickname()
            assert.equal(mine.state.nickname.value, '小羊');
            assert.equal(mine.state.lifetimeDifference.value, 20)
            const records = app.setup('records');
            t.after(records.dispose);
            await records.ready
            assert.equal(records.state.records.value.length, 1)
            const detail = app.setup('record-detail', {recordId: records.state.records.value[0].id});
            t.after(detail.dispose);
            await detail.ready
            detail.state.confirmDelete();
            await detail.state.confirmation.confirm();
            assert.equal(records.state.records.value.length, 0)
            const receipts = app.setup('receipts');
            t.after(receipts.dispose);
            await receipts.ready;
            assert.equal(receipts.state.receipts.value.length, 1)
        })
        test('打印动画与收藏预览读取不可变结果', async t => {
            const app = pageHarness();
            await app.ready;
            await app.services.sessionStore.startSingle(10000, 'sukiyaki');
            await app.services.personal.saveReceipt(app.services.dining.preview('niuniu'))
            const result = app.setup('result');
            t.after(result.dispose);
            await result.ready
            let previewed = 0;
            result.state.album.openPreview = async () => { previewed++; };
            await result.state.openReceiptPreview();
            assert.equal(previewed, 0)
            result.state.onPrintEnd({animationName: 'receipt-feed'});
            await result.state.openReceiptPreview();
            assert.equal(previewed, 1)
            const saved = app.setup('result', {receiptId: app.services.personal.receipt().activityId});
            t.after(saved.dispose);
            await saved.ready
            assert.equal(saved.state.isSavedView.value, true);
            assert.equal(saved.state.isPrinting.value, false)
        })
        for (const name of ['setup', 'menu', 'mine', 'creator', 'custom-menu', 'order-slip', 'result', 'receipts', 'records', 'record-detail']) {
            test(`${name} 在空个人数据或默认目录下可渲染`, async () => {
                assert.ok((await pageHarness().render(name)).length > 20)
            })
        }
    }
}
