const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule} = require('../helpers/runtime.cjs')

function navigation(depth = 1, failBack = false) {
    const calls = []
    const platform = Object.fromEntries(['navigateTo', 'redirectTo', 'reLaunch', 'navigateBack'].map(method => [method, options => {
        calls.push([method, options.url])
        if (method === 'navigateBack' && failBack) options.fail(new Error('empty stack'))
        else options.success()
    }]))
    const {UniBuffetNavigation} = loadModule('ui/navigation/UniBuffetNavigation', platform, new Map(), {
        getCurrentPages: () => Array.from({length: depth})
    })
    return {
        calls, nav: new UniBuffetNavigation(), setDepth: value => {
            depth = value
        }
    }
}

test('导航保留全部页面路径、参数编码和三种打开方式', async () => {
    const {calls, nav} = navigation()
    for (const destination of ['setup', 'menu', 'mine', 'receipts', 'records', 'custom-menu', 'creator']) {
        await nav.open(destination)
        assert.deepEqual(calls.pop(), ['navigateTo', `/pages/${destination}/index`])
    }
    await nav.open('menu', 'replace');
    await nav.open('setup', 'reset');
    await nav.toOrderSlip()
    await nav.toResult('a&b', 'replace');
    await nav.toRecord('a/b')
    await nav.toCustomMenu('a b');
    await nav.toMenuPreview('a?b')
    assert.deepEqual(calls, [
        ['redirectTo', '/pages/menu/index'], ['reLaunch', '/pages/setup/index'], ['navigateTo', '/pages/order-slip/index'],
        ['redirectTo', '/pages/result/index?receiptId=a%26b'], ['navigateTo', '/pages/record-detail/index?recordId=a%2Fb'],
        ['navigateTo', '/pages/custom-menu/index?restaurantId=a%20b'], ['navigateTo', '/pages/menu/index?previewId=a%3Fb']
    ])
})
test('返回支持根页面兜底和失败兜底', async () => {
    for (const [depth, failBack, expected] of [
        [1, false, [['redirectTo', '/pages/setup/index']]],
        [2, false, [['navigateBack', undefined]]],
        [2, true, [['navigateBack', undefined], ['redirectTo', '/pages/setup/index']]]
    ]) {
        const {nav, calls} = navigation(depth, failBack)
        await nav.back('setup');
        assert.deepEqual(calls, expected)
    }
})

test('每次返回时读取当前页面栈', async () => {
    const {nav, calls, setDepth} = navigation(2)
    await nav.back('setup')
    setDepth(1)
    await nav.back('mine')
    assert.deepEqual(calls, [['navigateBack', undefined], ['redirectTo', '/pages/mine/index']])
})

test('重复返回首页共享同一次跳转，其他导航按顺序执行，失败后仍可重试', async () => {
    const calls = [], pending = []
    const platform = Object.fromEntries(['navigateTo', 'redirectTo', 'reLaunch', 'navigateBack'].map(method => [method, options => {
        calls.push([method, options.url]); pending.push(options)
    }]))
    const {UniBuffetNavigation} = loadModule('ui/navigation/UniBuffetNavigation', platform)
    const nav = new UniBuffetNavigation()
    const first = nav.open('setup', 'reset'), duplicate = nav.open('setup', 'reset')
    assert.equal(first, duplicate)
    assert.equal(nav.isNavigating(), true)
    const next = nav.open('menu')
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(calls.length, 1)
    pending.shift().success()
    await first
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(calls.length, 2)
    pending.shift().fail(new Error('failed'))
    await assert.rejects(next, /页面打开失败/)
    assert.equal(nav.isNavigating(), false)
    const retry = nav.open('menu')
    await new Promise(resolve => setImmediate(resolve))
    pending.shift().success()
    await retry
    assert.equal(nav.isNavigating(), false)
})
