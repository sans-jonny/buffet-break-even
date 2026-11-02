require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {PageAmount} = require('../../src/ui/presentation/PageAmount.ts')
const {StartSingleDiningUseCase} = require('../../src/coordination/application/port/in/session/StartSingleDiningUseCase.ts')
const {PublishLocalRestaurantUseCase} = require('../../src/coordination/application/port/in/catalog/PublishLocalRestaurantUseCase.ts')
const {InvalidRequestError} = require('../../src/kernel/application/InvalidRequestError.ts')
const {DiningScenario} = require('../support/DiningScenario.ts')

test('金额解析只解码文本；负数、零和超限值统一由 Request 拒绝', () => {
    assert.equal(PageAmount.minor(' +12.30 '), 1230)
    assert.equal(PageAmount.minor('-0.01'), -1)
    assert.throws(() => PageAmount.minor('12.345'), /最多两位/)
    for (const text of ['-1', '0', '90071992547410']) {
        const minor = PageAmount.minor(text)
        assert.throws(() => new StartSingleDiningUseCase.Request(minor, 'My'), error =>
            error instanceof InvalidRequestError && error.message === 'INVALID_TICKET_PRICE')
    }
})

test('完整目录输入在 Request 构造时拒绝重复 ID、空名称和缺失分类', () => {
    const value = DiningScenario.restaurant()
    for (const invalid of [
        {...value, products: [value.products[0], value.products[0]]},
        {...value, name: ' '},
        {...value, products: [{...value.products[0], categoryId: 'missing'}]}
    ]) assert.throws(() => new PublishLocalRestaurantUseCase.Request(invalid), InvalidRequestError)
})
