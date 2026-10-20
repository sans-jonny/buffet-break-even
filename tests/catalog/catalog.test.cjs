const assert = require('node:assert/strict')
const test = require('node:test')
const {application, loadModule, plain} = require('../helpers/runtime.cjs')

test('完整目录查询不受页面分类过滤影响，返回独立 DTO', () => {
  const app = application()
  const {GetCatalogInput} = app.load('contexts/catalog/public')
  const complete = app.execute('GetCatalog')
  assert.ok(complete instanceof GetCatalogInput.Response)
  const ids = complete.products.map(product => product.id)
  assert.ok(ids.includes('beef'))
  assert.ok(new Set(complete.products.map(product => product.category)).size > 1)
  const first = {...complete.products[0]}
  complete.products[0].price = 999
  complete.products.splice(1)
  const next = app.execute('GetCatalog')
  assert.equal(next.products.length, ids.length)
  assert.deepEqual(plain(next.products[0]), first)
})

test('Dining 目录适配器只使用公开查询并隔离上下文之间的数据引用', () => {
  const Adapter = loadModule('contexts/dining/session/infrastructure/integration/CatalogGatewayAdapter').CatalogGatewayAdapter
  const external = [{id: 'special', name: '特别菜品', price: 1.25, level: 'L', category: 'C', internal: 'hidden'}]
  let calls = 0
  const adapter = new Adapter({execute(request) {calls++; assert.deepEqual(Object.keys(request), []); return {products: external}}})
  const local = adapter.products()
  assert.equal(calls, 1)
  assert.equal(local[0].id, 'special')
  assert.equal(local[0].internal, undefined)
  local[0].price = 999
  assert.equal(external[0].price, 1.25)
})
