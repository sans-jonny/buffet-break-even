require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {CommandState} = require('../../src/stores/CommandState.ts')

test('并发命令分别持有查询租约，直到最后一个完成才清除 loading', async () => {
    let leases = 0, settled = 0
    const commands = CommandState.create({
        acquire: () => { leases++; return () => leases-- },
        settled: async () => { settled++ }
    })
    let finishFirst, finishSecond
    const first = commands.run(() => new Promise(resolve => { finishFirst = resolve }))
    const second = commands.run(() => new Promise(resolve => { finishSecond = resolve }))
    assert.equal(leases, 2)
    assert.equal(commands.loading.value, true)
    finishFirst('first')
    assert.equal(await first, 'first')
    assert.equal(leases, 1)
    assert.equal(commands.loading.value, true)
    finishSecond('second')
    assert.equal(await second, 'second')
    assert.equal(leases, 0)
    assert.equal(commands.loading.value, false)
    assert.equal(settled, 2)
})

test('写命令失败释放订阅且不重试，下次命令清除旧错误并返回原响应', async () => {
    let leases = 0, calls = 0, settled = 0
    const commands = CommandState.create({
        acquire: () => { leases++; return () => leases-- },
        settled: async () => { settled++ }
    })
    const failure = new Error('WRITE_FAILED')
    await assert.rejects(commands.run(async () => { calls++; throw failure }), error => error === failure)
    assert.equal(calls, 1)
    assert.equal(settled, 0)
    assert.equal(leases, 0)
    assert.equal(commands.loading.value, false)
    assert.equal(commands.error.value, failure)
    const response = {value: 'saved'}
    assert.equal(await commands.run(async () => response), response)
    assert.equal(commands.error.value, null)
    assert.equal(leases, 0)
})

test('获取查询订阅失败也会恢复命令状态，并且不会执行写入', async () => {
    let calls = 0
    const commands = CommandState.create({acquire: () => { throw new Error('ACQUIRE_FAILED') }})
    await assert.rejects(commands.run(async () => calls++), /ACQUIRE_FAILED/)
    assert.equal(calls, 0)
    assert.equal(commands.loading.value, false)
    assert.match(commands.error.value.message, /ACQUIRE_FAILED/)
})
