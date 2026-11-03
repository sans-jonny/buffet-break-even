require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {nextTick, watchEffect} = require('vue')
const {pageHarness} = require('../helpers/pages.cjs')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {PublishLocalRestaurantUseCase} = require('../../src/coordination/application/port/in/catalog/PublishLocalRestaurantUseCase.ts')

const flush = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)) }

for (const mode of ['single', 'shared']) {
    test(`${mode} 菜单退出到 setup 时持续渲染消费数据，不产生空 ID 查询`, async t => {
        const app = pageHarness()
        await app.ready
        t.after(app.services.dispose)
        if (mode === 'single') await app.services.sessionStore.startSingle(10000, 'sukiyaki')
        else {
            const meal = await new DiningScenario.Meal().givenRestaurant()
            t.after(meal.app.dispose)
            await meal.givenRoom()
            const activity = meal.dining.activity(), room = meal.dining.room()
            t.mock.method(app.services.runtime.remote, 'read', meal.relay.read.bind(meal.relay))
            t.mock.method(app.services.runtime.remote, 'append', meal.relay.append.bind(meal.relay))
            t.after(meal.relay.listen(batch => { void app.services.runtime.projectCommitted(batch).catch(() => {}); }))
            t.mock.method(app.services.runtime, 'roomBaseline', async () => {})
            await app.services.runtime.local(state => {
                state['personal/identity'] = meal.dining.identity()
                state['personal/session'] = meal.dining.session()
                state[`accounting/activity/${activity.id}`] = activity
                state['collaboration/room/room'] = room
                state['catalog/room/restaurant/room:buffet'] = meal.app.runtime.get('catalog/room/restaurant/room:buffet')
                state['cursor/room'] = meal.relay.streams.get('room').at(-1).toVersion
            })
        }
        const menu = app.setup('menu')
        t.after(menu.dispose)
        await menu.ready
        const failures = []
        const stop = watchEffect(() => {
            try {
                void menu.state.totalSelectedCount.value
                void menu.state.rounds.value
                void menu.state.selectedLines.value
                void menu.state.displayValue.value
            } catch (error) { failures.push(error.message) }
        }, {flush: 'sync'})
        t.after(stop)
        await menu.state.returnToSetup()
        await flush()
        await app.services.queries.settled()
        assert.deepEqual(failures, [])
        assert.equal(menu.state.totalSelectedCount.value, 0)
        assert.equal(menu.state.rounds.value.length, 0)
        assert.deepEqual(app.calls, [['open', 'setup', 'reset']])
        assert.equal(app.services.queries.client.getQueryCache().getAll().some(query =>
            query.queryKey[0] === 'accounting' && query.queryKey[1] === 'consumption' &&
            (!query.queryKey[2] || !query.queryKey[3])), false)
    })
}

for (const [method, args, expected] of [
    ['goBack', [], ['back', 'setup']],
    ['openTab', ['mine'], ['open', 'mine', 'replace']],
    ['returnToSetup', [], ['open', 'setup', 'reset']]
]) {
    test(`主动 ${method} 清理空用餐时不额外触发无效 Activity 跳转`, async t => {
        const app = pageHarness()
        await app.ready
        t.after(app.services.dispose)
        await app.services.sessionStore.startSingle(10000, 'sukiyaki')
        const menu = app.setup('menu')
        t.after(menu.dispose)
        await menu.ready
        await menu.state[method](...args)
        await flush()
        assert.deepEqual(app.calls, [expected])
    })
}

for (const invalid of ['no-session', 'missing-activity', 'abandoned', 'missing-room']) {
    test(`菜单在 ${invalid} 时返回准备页，不读取无效用餐结果`, async t => {
        const app = pageHarness()
        await app.ready
        t.after(app.services.dispose)
        if (invalid !== 'no-session') {
            await app.services.sessionStore.startSingle(10000, 'sukiyaki')
            if (invalid === 'abandoned') await app.services.dining.abandon()
            else if (invalid === 'missing-room') {
                const id = app.services.dining.session().activityId
                await app.services.runtime.local(state => {
                    state[`accounting/activity/${id}`].mode = 'SHARED'
                    state['personal/session'] = {scopeId: 'missing-room', roomId: 'missing-room', activityId: id}
                })
            } else {
                const id = app.services.dining.session().activityId
                await app.services.runtime.local(state => { delete state[`accounting/activity/${id}`] })
            }
        }
        const menu = app.setup('menu')
        t.after(menu.dispose)
        await menu.ready
        await flush()
        assert.deepEqual(app.calls, [['open', 'setup', 'replace']])
        assert.equal(menu.state.products.value.length, 0)
    })
}

test('预览无需 Activity；切换餐厅档位默认不选菜品分类、显示全部菜品', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    const preview = app.setup('menu', {previewId: 'niuniu'})
    t.after(preview.dispose)
    await preview.ready
    await flush()
    assert.deepEqual(app.calls, [])
    assert.deepEqual(Array.from(preview.state.restaurants.value, r => r.id), ['niuniu'])
    assert.equal(preview.state.currentRestaurant.value.id, 'niuniu')
    preview.state.selectRestaurant('sukiyaki')
    assert.equal(preview.state.currentRestaurant.value.id, 'niuniu')
    preview.dispose()
    await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    menu.state.selectCategory(menu.state.categories.value[0])
    assert.ok(menu.state.filteredProducts.value.length < menu.state.products.value.length)
    menu.state.selectRestaurant(menu.state.restaurants.value[1].id)
    assert.equal(menu.state.activeCategory.value, '')
    assert.equal(menu.state.filteredProducts.value.length, menu.state.products.value.length)
})

test('预览只渲染当前餐厅菜品，隐藏餐厅档位栏', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    const html = await app.render('menu', state => {
        state.isPreview.value = true
        state.previewRestaurantId.value = 'niuniu'
        state.restaurantId.value = 'niuniu'
    })
    assert.doesNotMatch(html, /dining-level-tabs/)
    assert.match(html, /product-list/)
    assert.match(html, /category-list/)
})

test('在线创建者重新加入时同步已有私人菜单；不重复加入，不上传新建但未共享的私人餐厅', async t => {
    const host = await new DiningScenario.Meal().givenRestaurant()
    t.after(host.app.dispose)
    await host.givenRoom()
    const original = DiningScenario.restaurant({version: 2, name: '本机更新'})
    await host.app.resolve(PublishLocalRestaurantUseCase.token).execute(new PublishLocalRestaurantUseCase.Request(original))
    await host.givenRestaurant({id: 'not-shared'})
    const joins = () => host.relay.streams.get('room').flatMap(batch => batch.events).filter(event => event.type === 'MemberJoined').length
    const before = joins()
    await host.joinRoom('room')
    assert.equal(host.dining.restaurants().find(r => r.id === 'room:buffet').name, '本机更新')
    assert.equal(host.dining.restaurants().some(r => r.id === 'room:not-shared'), false)
    assert.equal(joins(), before)
    const sent = host.relay.sent
    await host.joinRoom('room')
    assert.equal(host.relay.sent, sent)
    await host.leave()
    await host.app.resolve(PublishLocalRestaurantUseCase.token).execute(new PublishLocalRestaurantUseCase.Request({...original, version: 3, name: '离房后更新'}))
    await host.joinRoom('room')
    assert.equal(host.dining.restaurants().find(r => r.id === 'room:buffet').name, '离房后更新')
})

test('加入其他人的房间不会用本地同 ID 私人菜单覆盖房间副本', async t => {
    const host = await new DiningScenario.Meal().givenRestaurant()
    t.after(host.app.dispose)
    await host.givenRoom()
    const guest = await new DiningScenario.Meal(host.relay, 'guest').givenRestaurant({name: '其他人的本地菜单'})
    t.after(guest.app.dispose)
    await guest.givenRestaurant({version: 2, name: '其他人的本地菜单'})
    await guest.joinRoom('room')
    assert.equal(guest.dining.restaurants().find(r => r.id === 'room:buffet').name, '同名餐厅')
})
