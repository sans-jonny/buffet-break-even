require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {createHash} = require('node:crypto')
const sharp = require('../../server/node_modules/sharp')
const {DefaultNickname} = require('../../src/coordination/application/service/DefaultNickname.ts')
const {InitializeIdentityUseCase} = require('../../src/coordination/application/port/in/device/InitializeIdentityUseCase.ts')
const {InitializeDiningUseCase} = require('../../src/coordination/application/port/in/initialization/InitializeDiningUseCase.ts')
const {GetPersonalDiningUseCase} = require('../../src/coordination/application/port/in/device/GetPersonalDiningUseCase.ts')
const {ChangeLocalNicknameUseCase} = require('../../src/coordination/application/port/in/device/ChangeLocalNicknameUseCase.ts')
const {ListRestaurantsUseCase} = require('../../src/contexts/catalog/application/port/in/ListRestaurantsUseCase.ts')
const {DeleteRestaurantUseCase} = require('../../src/contexts/catalog/application/port/in/DeleteRestaurantUseCase.ts')
const {Bootstrap} = require('../../src/composition/Bootstrap.ts')
const {ReferenceDiningCatalog} = require('../../src/composition/ReferenceDiningCatalog.ts')
const {PublicProductImages} = require('../../src/infrastructure/media/PublicProductImages.ts')
const {ProductImageClient} = require('../../src/infrastructure/media/ProductImageClient.ts')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {RelaySpec} = require('../event-store/RelaySpec.ts')
const {RelayServer} = require('../../server/src/transport/RelayServer.ts')
const countsBefore = [25, 25, 25, 21, 21, 24, 24, 18, 18]
const rows = () => ReferenceDiningCatalog.restaurants().flatMap(r => r.products.map(p => ({restaurant: r, product: p})))

test('50个形容词和50个名词生成2500种“形容词的名词”中文昵称', () => {
    assert.equal(DefaultNickname.adjectives.length, 50)
    assert.equal(DefaultNickname.nouns.length, 50)
    assert.equal(new Set(DefaultNickname.adjectives).size, 50)
    assert.equal(new Set(DefaultNickname.nouns).size, 50)
    const names = new Set()
    for (let a = 0; a < 50; a++) for (let n = 0; n < 50; n++) {
        const values = [(a + .5) / 50, (n + .5) / 50]
        const name = DefaultNickname.generate(() => values.shift())
        assert.equal(name, `${DefaultNickname.adjectives[a]}的${DefaultNickname.nouns[n]}`)
        assert.match(name, /^[\u4e00-\u9fff]{2}的[\u4e00-\u9fff]{2}$/)
        names.add(name)
    }
    assert.equal(names.size, 2500)
    assert.equal(DefaultNickname.generate(() => 0), '活泼的熊猫')
})

test('首次进入生成并保存随机昵称，重复初始化和重启保留用户已设置的昵称', async t => {
    const storage = new DiningScenario.Storage()
    let sequence = 0
    const options = {storage, id: () => `new-user-${++sequence}`, now: () => '2026-11-02T12:00:00.000Z'}
    const app = Bootstrap.create(options)
    t.after(app.dispose)
    const initialize = app.resolve(InitializeIdentityUseCase.token)
    await initialize.execute(new InitializeIdentityUseCase.Request('first-user'))
    const first = app.resolve(GetPersonalDiningUseCase.token).execute().identity
    assert.match(first.nickname, /^[\u4e00-\u9fff]{2}的[\u4e00-\u9fff]{2}$/)
    await initialize.execute(new InitializeIdentityUseCase.Request('unused-user', '不应覆盖'))
    assert.deepEqual(app.resolve(GetPersonalDiningUseCase.token).execute().identity, first)
    await app.resolve(ChangeLocalNicknameUseCase.token).execute(new ChangeLocalNicknameUseCase.Request('我选的昵称'))
    const restarted = Bootstrap.create(options)
    t.after(restarted.dispose)
    await restarted.resolve(InitializeDiningUseCase.token).execute(new InitializeDiningUseCase.Request())
    assert.deepEqual(restarted.resolve(GetPersonalDiningUseCase.token).execute().identity, {id: first.id, nickname: '我选的昵称'})
    assert.throws(() => new InitializeIdentityUseCase.Request('new', ' '), /INVALID_NICKNAME/)
})

test('9家公共餐厅保留商品ID和分类，参考菜单合计301个商品', () => {
    const restaurants = ReferenceDiningCatalog.restaurants()
    assert.equal(restaurants.length, 9)
    assert.equal(restaurants.reduce((sum, r) => sum + r.products.length, 0) - countsBefore.reduce((a, b) => a + b, 0), 100)
    assert.deepEqual(restaurants.map((r, i) => r.products.length - countsBefore[i]), [12, 11, 11, 11, 11, 11, 11, 11, 11])
    const addedIds = []
    restaurants.forEach((restaurant, i) => {
        assert.equal(new Set(restaurant.products.map(p => p.id)).size, restaurant.products.length)
        restaurant.products.forEach(p => {
            assert.ok(restaurant.categories.some(c => c.id === p.categoryId))
            assert.ok(Number.isSafeInteger(p.priceMinor) && p.priceMinor > 0)
            assert.equal('coverUrl' in p, false)
            assert.equal('emoji' in p, false)
        })
        addedIds.push(...restaurant.products.slice(countsBefore[i]).map(p => p.id))
    })
    assert.equal(new Set(addedIds).size, 100)
    assert.equal(restaurants[0].products.find(p => p.id === 'shrimp').priceMinor, 1800)
})

test('各家餐厅有独立菜品，同类别餐厅不再复用整套菜单', () => {
    const restaurants = ReferenceDiningCatalog.restaurants()
    for (let i = 0; i < restaurants.length; i++) for (let j = i + 1; j < restaurants.length; j++) {
        const a = restaurants[i], b = restaurants[j]
        const names = new Set(a.products.map(p => p.name))
        const overlap = b.products.filter(p => names.has(p.name)).length
        assert.ok(overlap / Math.min(a.products.length, b.products.length) < .35, `${a.name} / ${b.name}: ${overlap} repeated dishes`)
    }
    assert.equal(restaurants.find(r => r.id === 'niuniu').products.find(p => p.id === 'beef').name, '牛上脑')
    assert.equal(restaurants.find(r => r.id === 'daniu').products.find(p => p.id === 'beef').name, '谷饲牛肩片')
    assert.equal(restaurants.find(r => r.id === 'yixu').products.find(p => p.id === 'beef').name, '安格斯牛板腱')
})

test('已有公共目录启动后补入新增商品，重复初始化不加版本、不恢复用户已删除餐厅', async t => {
    let sequence = 0
    const app = Bootstrap.create({storage: new DiningScenario.Storage(), id: () => `catalog-${++sequence}`, now: () => '2026-11-02T12:00:00.000Z'})
    t.after(app.dispose)
    const initialize = app.resolve(InitializeDiningUseCase.token)
    const menus = ReferenceDiningCatalog.restaurants()
    const list = () => app.resolve(ListRestaurantsUseCase.token).execute(new ListRestaurantsUseCase.Request('local', true)).value
    await initialize.execute(new InitializeDiningUseCase.Request(menus.map((r, i) => ({...r, products: r.products.slice(0, countsBefore[i])}))))
    assert.equal(list().reduce((sum, r) => sum + r.products.length, 0), 201)
    await initialize.execute(new InitializeDiningUseCase.Request(menus))
    assert.equal(list().reduce((sum, r) => sum + r.products.length, 0), 301)
    assert.ok(list().every(r => r.version === 2))
    await initialize.execute(new InitializeDiningUseCase.Request(menus))
    assert.ok(list().every(r => r.version === 2))
    await app.resolve(DeleteRestaurantUseCase.token).execute(new DeleteRestaurantUseCase.Request({scopeId: 'local-catalog', roomId: null}, 'local', 'niuniu'))
    await initialize.execute(new InitializeDiningUseCase.Request(menus))
    assert.equal(list().find(r => r.id === 'niuniu').deleted, true)
})

test('45张服务端图片分别用于45个商品；246个唯一Picsum占位和10个纯emoji商品', () => {
    const media = new ProductImageClient('http://relay.test')
    const local = [], remote = [], empty = []
    for (const {restaurant, product} of rows()) {
        const cover = media.cover(restaurant, product.id)
        if (!cover) {
            empty.push(`${restaurant.id}/${product.id}`)
            assert.equal(media.emoji(restaurant, product.id), PublicProductImages.emojiOnly[`${restaurant.id}/${product.id}`])
        } else if (cover.startsWith('http://relay.test/sample-images/')) local.push(cover)
        else {
            assert.match(cover, /^https:\/\/picsum\.photos\/seed\/[^/]+\/100\/100$/)
            assert.equal(media.cover(restaurant, product.id), cover)
            remote.push(cover)
        }
    }
    assert.equal(local.length, 45)
    assert.equal(new Set(local).size, 45)
    assert.equal(remote.length, 246)
    assert.equal(new Set(remote).size, 246)
    assert.equal(empty.length, 10)
    assert.deepEqual(empty.sort(), Object.keys(PublicProductImages.emojiOnly).sort())
    assert.notEqual(media.cover({id: 'niuniu', type: 'PUBLIC'}, 'beef'), media.cover({id: 'daniu', type: 'PUBLIC'}, 'beef'))
})

test('40张新增照片都有来源、可解码且内容不同；服务端实际提供所有45张图片', async t => {
    const directory = path.resolve('server/public/sample-images')
    const sources = JSON.parse(fs.readFileSync(path.join(directory, 'SOURCES.json'), 'utf8'))
    assert.equal(sources.length, 40)
    assert.equal(new Set(sources.map(s => s.photoId)).size, 40)
    const hashes = new Set()
    for (const source of sources) {
        assert.match(source.sourceUrl, /^https:\/\/www\.pexels\.com\/photo\//)
        assert.equal(source.licenseUrl, 'https://www.pexels.com/license/')
        const bytes = fs.readFileSync(path.join(directory, source.filename))
        const info = await sharp(bytes).metadata()
        assert.equal(info.format, 'jpeg')
        assert.equal(info.width, 100)
        assert.equal(info.height, 100)
        hashes.add(createHash('sha256').update(bytes).digest('hex'))
        const [restaurantId, productId] = source.assignedProduct.split('/')
        assert.equal(PublicProductImages.cover(restaurantId, productId), `/sample-images/${source.filename}?v=100`)
    }
    assert.equal(hashes.size, 40)
    const database = await RelaySpec.database()
    t.after(database.dispose)
    const server = await RelayServer.create(database.db)
    t.after(() => server.close())
    const paths = new Set(rows().map(({restaurant, product}) => PublicProductImages.cover(restaurant.id, product.id)).filter(url => url.startsWith('/sample-images/')))
    for (const url of paths) {
        const response = await server.inject({url})
        assert.equal(response.statusCode, 200, url)
        assert.match(response.headers['content-type'], /image\/jpeg/)
        const metadata = await sharp(response.rawPayload).metadata()
        assert.equal(metadata.width, 100)
        assert.equal(metadata.height, 100)
    }
})
