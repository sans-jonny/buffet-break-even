require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {nextTick} = require('vue')
const {pageHarness} = require('../helpers/pages.cjs')
const {DiningScenario} = require('../support/DiningScenario.ts')
const flush = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)) }

test('多次用餐的小票分别保存、按 ID 预览和删除；历史徽标按餐数计数', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    const saved = []
    for (let i = 0; i < 2; i++) {
        await app.services.sessionStore.startSingle(10000, 'sukiyaki')
        const menu = app.setup('menu'), order = app.setup('order-slip')
        await Promise.all([menu.ready, order.ready])
        for (let round = 0; round < 2; round++) {
            await app.services.dining.edit('niuniu', 'add', 'beef', i + 1)
            await order.state.completeRound()
        }
        await app.services.dining.finish('niuniu')
        const result = app.services.dining.activity().result
        saved.push(result)
        await app.services.personal.saveReceipt(result)
        menu.dispose(); order.dispose()
    }
    await app.services.personal.saveReceipt(saved[0]) // Re-saving this meal updates only its own receipt.
    const receipts = app.setup('receipts'), mine = app.setup('mine')
    t.after(receipts.dispose); t.after(mine.dispose)
    await Promise.all([receipts.ready, mine.ready])
    assert.equal(receipts.state.receipts.value.length, 2)
    assert.equal(mine.state.receiptsCount.value, 2)
    assert.equal(mine.state.meals.value, 2)
    assert.equal(app.services.personal.history().reduce((n, record) => n + record.rounds.length, 0), 4)
    const preview = app.setup('result', {receiptId: saved[0].activityId})
    t.after(preview.dispose)
    await preview.ready
    assert.equal(preview.state.displayReceipt.value.id, saved[0].activityId)
    assert.equal(preview.state.displayReceipt.value.value, saved[0].foodValueMinor / 100)
    await preview.state.deleteReceipt()
    await flush()
    assert.deepEqual(Array.from(receipts.state.receipts.value, r => r.id), [saved[1].activityId])
    assert.equal(mine.state.receiptsCount.value, 1)
    assert.equal(mine.state.meals.value, 2)
})

test('升级前保留的单张小票可读取，保存新小票时原子迁入集合且不覆盖', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    const original = app.services.dining.preview('niuniu')
    await app.services.runtime.local(state => { state['personal/receipt'] = original })
    const personal = () => app.services.queries.personal()
    assert.equal(personal().receipts[0].activityId, original.activityId)
    const other = {...original, activityId: 'second-meal', date: '2099-01-01T00:00:00.000Z'}
    await app.services.personal.saveReceipt(other)
    assert.equal(personal().receipts.length, 2)
    assert.equal(app.services.runtime.get('personal/receipt'), undefined)
    assert.equal(app.services.runtime.get(`personal/receipts/${original.activityId}`).activityId, original.activityId)
})

async function menuFixture(t, shared = false) {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    if (!shared) await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    else {
        const meal = await new DiningScenario.Meal().givenRestaurant()
        t.after(meal.app.dispose)
        await meal.givenRoom()
        t.mock.method(app.services.runtime.remote, 'read', meal.relay.read.bind(meal.relay))
        t.mock.method(app.services.runtime.remote, 'append', meal.relay.append.bind(meal.relay))
        t.after(meal.relay.listen(batch => { void app.services.runtime.projectCommitted(batch).catch(() => {}) }))
        t.mock.method(app.services.runtime, 'roomBaseline', async () => {})
        await app.services.runtime.local(state => {
            const activity = meal.dining.activity()
            state['personal/identity'] = meal.dining.identity()
            state['personal/session'] = meal.dining.session()
            state[`accounting/activity/${activity.id}`] = activity
            state['collaboration/room/room'] = meal.dining.room()
            state['catalog/room/restaurant/room:buffet'] = meal.app.runtime.get('catalog/room/restaurant/room:buffet')
            state['cursor/room'] = meal.relay.streams.get('room').at(-1).toVersion
        })
    }
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    return {app, menu}
}

for (const shared of [false, true]) {
    test(`${shared ? '多人' : '单人'}从菜单切换我的并返回，保留空活动及后续消费`, async t => {
        const {app, menu} = await menuFixture(t, shared)
        const session = app.services.dining.session()
        await menu.state.openTab('mine')
        for (const hide of app.hooks.onHide || []) hide()
        menu.dispose()
        assert.deepEqual(app.services.dining.session(), session)
        assert.equal(app.services.dining.activity().status, 'ACTIVE')
        if (shared) assert.ok(app.services.dining.room().members.find(m => m.id === app.services.dining.identity().id).present)
        const mine = app.setup('mine')
        t.after(mine.dispose)
        await mine.ready
        await mine.state.openTab('menu')
        const resumed = app.setup('menu')
        t.after(resumed.dispose)
        await resumed.ready
        const productId = resumed.state.products.value[0].id
        await resumed.state.addItem(productId)
        assert.equal(resumed.state.totalSelectedCount.value, 1)
        await resumed.state.openTab('mine')
        assert.deepEqual(app.services.dining.session(), session)
        assert.equal(app.services.dining.activity().status, 'ACTIVE')
        assert.equal(app.services.dining.consumption(resumed.state.restaurantId.value).rounds[0].items[productId], 1)
    })
}

for (const method of ['goBack', 'returnToSetup', 'nativeBack', 'apiBack', 'exit']) {
    test(`空单人活动通过 ${method} 离开时清理，重复返回不会重复提交`, async t => {
        const {app, menu} = await menuFixture(t)
        const activityId = app.services.dining.session().activityId
        if (method === 'exit') await app.services.lifecycle.exit()
        else if (method === 'nativeBack' || method === 'apiBack') {
            assert.equal(app.hooks.onBackPress.at(-1)({from: method === 'apiBack' ? 'navigateBack' : 'backbutton'}), true)
            for (let n = 0; n < 20 && app.services.dining.session(); n++) await flush()
        } else await menu.state[method]()
        await flush()
        assert.equal(app.services.dining.session(), undefined)
        assert.equal(app.services.queries.activities().find(a => a.id === activityId).status, 'ABANDONED')
    })
}

test('已有菜品或已提交轮次的单人活动返回后保留，移除未提交菜品后退出清理', async t => {
    const {app, menu} = await menuFixture(t)
    const session = app.services.dining.session()
    await menu.state.addItem('beef')
    await menu.state.goBack()
    assert.deepEqual(app.services.dining.session(), session)
    await menu.state.removeItem('beef')
    await menu.state.goBack()
    assert.equal(app.services.dining.session(), undefined)
    await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    const next = app.setup('menu'), order = app.setup('order-slip')
    t.after(next.dispose); t.after(order.dispose)
    await Promise.all([next.ready, order.ready])
    await next.state.addItem('beef')
    await order.state.completeRound()
    await next.state.goBack()
    assert.equal(app.services.dining.activity().status, 'ACTIVE')
})

for (const method of ['goBack', 'exit']) {
    test(`多人活动 ${method} 时退出房间，保留房间供再次加入`, async t => {
        const {app, menu} = await menuFixture(t, true)
        const session = app.services.dining.session(), actor = app.services.dining.identity().id
        if (method === 'exit') await app.services.lifecycle.exit()
        else await menu.state.goBack()
        assert.equal(app.services.dining.session(), undefined)
        const room = app.services.queries.rooms().find(r => r.id === session.roomId)
        assert.equal(room.status, 'ACTIVE')
        assert.equal(room.members.find(m => m.id === actor).present, false)
    })
}

for (const shared of [false, true]) {
    test(`${shared ? '多人即使仅一人' : '单人'}历史、小票和导出标题保持类型在前，单人隐藏用餐人`, async t => {
        const {app, menu} = await menuFixture(t, shared)
        const restaurant = menu.state.currentRestaurant.value
        await menu.state.addItem(menu.state.products.value[0].id)
        await app.services.dining.finish(restaurant.id)
        const result = app.services.dining.activity().result
        assert.equal(result.mode, shared ? 'SHARED' : 'SINGLE')
        assert.equal(result.restaurantCategoryName, restaurant.restaurantCategory.name)
        await app.services.personal.saveReceipt(result)
        const records = app.setup('records'), detail = app.setup('record-detail', {recordId: result.activityId})
        const saved = app.setup('result', {receiptId: result.activityId})
        t.after(records.dispose); t.after(detail.dispose); t.after(saved.dispose)
        await Promise.all([records.ready, detail.ready, saved.ready])
        const {restaurantTitle} = require('../../src/ui/format/restaurantTitle.ts')
        const {ReceiptImage} = require('../../src/ui/receipt/ReceiptImage.ts')
        const expected = `${restaurant.restaurantCategory.name} · ${restaurant.name}${shared ? '（多人）' : ''}`
        for (const view of [records.state.records.value[0], detail.state.receipt.value, saved.state.displayReceipt.value]) {
            assert.equal(restaurantTitle.formatRestaurantTitle(view.restaurant, view.typeName, view.isMultiplayer), expected)
            assert.equal(view.participants.length, shared ? 1 : 0)
        }
        const image = ReceiptImage.layoutReceiptImage(saved.state.receiptProps.value)
        assert.ok(image.texts.some(text => text.text === expected))
        assert.equal(image.texts.some(text => text.text.startsWith('用餐人：')), shared)
        const rendering = pageHarness()
        await rendering.ready
        t.after(rendering.services.dispose)
        await rendering.services.runtime.local(state => { state[`personal/history/display/${result.activityId}`] = result })
        const html = await rendering.render('record-detail', state => { state.recordId.value = result.activityId })
        assert.ok(html.includes(expected))
        assert.equal(html.includes('用餐人：'), shared)
        assert.ok(html.includes('class="record-total"'))
        assert.ok(html.includes('class="round-box"'))
        assert.ok(html.includes(`就餐价格 ¥${result.ticketPriceMinor / 100}`))
        assert.ok(html.includes(`已吃价值 ¥${result.foodValueMinor / 100}`))
    })
}
