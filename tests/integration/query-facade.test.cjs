require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {QueryClient} = require('@tanstack/query-core')
const {effectScope, ref, isReadonly, nextTick, toRaw} = require('vue')
const {QueryToken} = require('../../src/infrastructure/query/QueryToken.ts')
const {QueryRegistry} = require('../../src/infrastructure/query/QueryRegistry.ts')
const {ReactiveQueryFacade} = require('../../src/infrastructure/query/ReactiveQueryFacade.ts')
const {QueryInvalidationAdapter} = require('../../src/infrastructure/query/QueryInvalidationAdapter.ts')
const {InvalidRequestError} = require('../../src/kernel/application/InvalidRequestError.ts')
const tick = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)) }
function fixture(t, options = {}) {
    const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity, gcTime: Infinity, networkMode: 'always', ...options}}})
    const registry = new QueryRegistry(), facade = new ReactiveQueryFacade(client, registry), adapter = new QueryInvalidationAdapter(client, registry)
    t.after(() => { adapter.dispose(); facade.dispose() })
    return {client, registry, facade, adapter}
}
function register(registry, execute, options = {}) {
    const token = QueryToken.create('detail')
    registry.register(token, {
        key: p => ['detail', p.id],
        request: p => { if (!p.id) throw new InvalidRequestError('INVALID_ID'); return Object.freeze({...p}) },
        execute,
        affected: (key, event) => key[0] === 'detail' && (!event.keys.length || event.keys.includes(`entity/${key[1]}`)),
        ...options
    })
    return token
}

test('未就绪不构造 Request；构造错误没有无效缓存，参数修正后恢复', async t => {
    const {registry, facade, client} = fixture(t)
    let calls = 0
    const token = register(registry, p => { calls++; return {value: p.id} })
    const params = ref(undefined), binding = facade.bind(token, () => params.value)
    assert.equal(client.getQueryCache().getAll().length, 0)
    assert.equal(binding.status.value, 'pending')
    assert.equal(binding.isFetching.value, false)
    params.value = {id: ''}
    assert.equal(binding.error.value.message, 'INVALID_ID')
    assert.equal(binding.status.value, 'error')
    assert.equal(calls, 0)
    assert.equal(client.getQueryCache().getAll().length, 0)
    params.value = {id: 'a'}
    await tick()
    assert.deepEqual(binding.data.value, {value: 'a'})
    assert.equal(binding.error.value, null)
    assert.equal(calls, 1)
    assert.ok(isReadonly(binding.data))
    assert.ok(isReadonly(binding.data.value))
})

test('同键页面各有 Observer，共享请求和缓存；卸载一页不影响另一页', async t => {
    const {registry, facade, client} = fixture(t)
    let calls = 0, finish
    const token = register(registry, p => { calls++; return new Promise(resolve => { finish = () => resolve({value: p.id}) }) })
    const a = effectScope(), b = effectScope()
    const one = a.run(() => facade.bind(token, () => ({id: 'a'})))
    const two = b.run(() => facade.bind(token, () => ({id: 'a'})))
    assert.equal(calls, 1)
    const query = client.getQueryCache().find({queryKey: ['detail', 'a']})
    assert.equal(query.getObserversCount(), 2)
    assert.equal(one.isFetching.value, true)
    finish(); await tick()
    assert.equal(one.data.value, two.data.value)
    a.stop(); one.dispose()
    assert.equal(query.getObserversCount(), 1)
    b.stop()
    assert.equal(query.getObserversCount(), 0)
})

test('参数快照和实例切换隔离；旧请求迟到不覆盖新绑定', async t => {
    const {registry, facade, client} = fixture(t), pending = new Map()
    const token = register(registry, p => new Promise(resolve => pending.set(p.id, () => resolve({value: p.id}))))
    const params = ref({id: 'a'}), binding = facade.bind(token, () => params.value)
    params.value.id = 'b'
    pending.get('b')(); await tick()
    assert.equal(binding.data.value.value, 'b')
    pending.get('a')(); await tick()
    assert.equal(binding.data.value.value, 'b')
    assert.equal(client.getQueryData(['detail', 'a']).value, 'a')
    assert.equal(client.getQueryData(['detail', 'b']).value, 'b')
})

test('事件合并定位详情和带筛选列表，刷新保留原 Request 上下文', async t => {
    const {registry, facade, adapter, client} = fixture(t), calls = []
    const token = register(registry, p => { calls.push(p.id); return {value: p.id} })
    const list = QueryToken.create('list')
    registry.register(list, {
        key: p => ['list', p.filter, p.page], request: p => Object.freeze({...p}),
        execute: p => { calls.push(`list:${p.filter}:${p.page}`); return {value: [p]} },
        affected: (key, event) => key[0] === 'list' && event.keys.some(k => k.startsWith('entity/'))
    })
    const one = facade.bind(token, () => ({id: 'a'})), two = facade.bind(token, () => ({id: 'b'}))
    const page = facade.bind(list, () => ({filter: 'active', page: 3}))
    await tick(); calls.length = 0
    adapter.onInvalidated({type: 'DataInvalidationEvent', keys: ['entity/a']})
    adapter.onInvalidated({type: 'DataInvalidationEvent', keys: ['entity/a']})
    await adapter.settled()
    assert.deepEqual(calls.sort(), ['a', 'list:active:3'])
    assert.equal(two.data.value.value, 'b')
    assert.equal(page.data.value.value[0].page, 3)
    assert.equal(client.getQueryData(['detail', 'a']), toRaw(one.data.value))
})

test('隐藏只暂停所属页面；非活跃查询失效后显示时刷新，释放幂等', async t => {
    const {registry, facade, adapter, client} = fixture(t)
    let version = 1, calls = 0
    const token = register(registry, () => { calls++; return {value: version} })
    const owner = effectScope(), otherOwner = effectScope()
    const one = owner.run(() => facade.bind(token, () => ({id: 'a'})))
    const other = otherOwner.run(() => facade.bind(token, () => ({id: 'b'})))
    await tick(); facade.suspend(owner); version = 2
    adapter.onInvalidated({type: 'DataInvalidationEvent', keys: ['entity/a', 'entity/b']})
    await adapter.settled()
    assert.equal(calls, 3)
    assert.equal(other.data.value.value, 2)
    assert.equal(one.data.value.value, 1)
    assert.equal(client.getQueryState(['detail', 'a']).isInvalidated, true)
    facade.resume(owner); await tick()
    assert.equal(one.data.value.value, 2)
    one.dispose(); one.dispose(); owner.stop(); otherOwner.stop()
    assert.equal(client.getQueryCache().find({queryKey: ['detail', 'a']}).getObserversCount(), 0)
})

test('同步初始化失败可显式重试，失败不会自动重试业务读取', async t => {
    const {registry, facade} = fixture(t)
    let calls = 0, failed = true
    const token = register(registry, () => { calls++; if (failed) throw new Error('READ_FAILED'); return {value: 1} }, {synchronous: true})
    const binding = facade.bind(token, () => ({id: 'a'}))
    await tick()
    assert.equal(binding.status.value, 'error')
    assert.equal(binding.error.value.message, 'READ_FAILED')
    assert.equal(calls, 1)
    failed = false; await binding.refresh()
    assert.equal(binding.status.value, 'success')
    assert.equal(binding.error.value, null)
    assert.equal(calls, 2)
})

test('注册检查和缓存回收；门面销毁后不再创建绑定', async t => {
    const {registry, facade, client} = fixture(t, {gcTime: 0})
    const token = register(registry, () => ({value: 1}))
    assert.throws(() => register({register: (_, definition) => registry.register(token, definition)}, () => 1), /重复注册/)
    assert.throws(() => facade.bind(QueryToken.create('missing'), () => ({})), /未注册/)
    const binding = facade.bind(token, () => ({id: 'a'}))
    await tick(); binding.dispose()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(client.getQueryCache().getAll().length, 0)
    facade.dispose(); facade.dispose()
    assert.throws(() => facade.bind(token, () => ({id: 'a'})), /已销毁/)
})

test('隐藏超过缓存回收时间后重新关联缓存，显示时读取新版本', async t => {
    const {registry, facade, client} = fixture(t, {gcTime: 0})
    let version = 1
    const token = register(registry, () => ({value: version}))
    const binding = facade.bind(token, () => ({id: 'a'}))
    await tick(); binding.pause()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(client.getQueryCache().getAll().length, 0)
    version = 2; binding.resume(); await tick()
    assert.equal(binding.data.value.value, 2)
    assert.equal(client.getQueryData(['detail', 'a']).value, 2)
    assert.equal(client.getQueryCache().getAll().length, 1)
})

test('同步本地查询正在刷新时，新页面复用该次请求', async t => {
    const {registry, facade, client} = fixture(t)
    let calls = 0
    const token = register(registry, () => ({value: ++calls}), {synchronous: true})
    const first = facade.bind(token, () => ({id: 'a'}))
    const refreshing = client.invalidateQueries({queryKey: ['detail', 'a']})
    const second = facade.bind(token, () => ({id: 'a'}))
    assert.equal(calls, 2)
    await refreshing
    assert.equal(first.data.value.value, 2)
    assert.equal(second.data.value.value, 2)
})
