require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {CommandState} = require('../../src/stores/CommandState.ts')

test('并发命令独立计数，最后一个完成后清除 loading，并返回原响应', async () => {
    const commands = CommandState.create()
    let finishFirst, finishSecond
    const first = commands.run(() => new Promise(resolve => { finishFirst = resolve }))
    const second = commands.run(() => new Promise(resolve => { finishSecond = resolve }))
    assert.equal(commands.loading.value, true)
    finishFirst('first'); assert.equal(await first, 'first')
    assert.equal(commands.loading.value, true)
    finishSecond('second'); assert.equal(await second, 'second')
    assert.equal(commands.loading.value, false)
})

test('命令或 Request 构造失败记录原错误，不重试；下次调用清除错误', async () => {
    const commands = CommandState.create()
    let calls = 0
    const failure = new Error('WRITE_FAILED')
    await assert.rejects(commands.run(() => { calls++; throw failure }), error => error === failure)
    assert.equal(calls, 1)
    assert.equal(commands.loading.value, false)
    assert.equal(commands.error.value, failure)
    const response = {value: 'saved'}
    assert.equal(await commands.run(async () => response), response)
    assert.equal(commands.error.value, null)
    commands.clearError(); assert.equal(commands.error.value, null)
})
