require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('../../server/node_modules/sharp')
const {RelayServer} = require('../../server/src/transport/RelayServer.ts')
const {RelaySpec} = require('../event-store/RelaySpec.ts')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {loadModule} = require('../helpers/runtime.cjs')
const {pageHarness} = require('../helpers/pages.cjs')
const {Restaurant} = require('../../src/contexts/catalog/domain/aggregate/Restaurant.ts')
const {createHash} = require('node:crypto')
const {mkdtemp, mkdir, writeFile, readFile, rm} = require('node:fs/promises')
const {join} = require('node:path')
const {tmpdir} = require('node:os')

async function fixture(t) {
    const database = await RelaySpec.database()
    let now = Date.parse('2026-11-02T00:00:00Z')
    const app = await RelayServer.create(database.db, {now: () => new Date(now)})
    t.after(async () => { await app.close(); await database.dispose() })
    return {app, db: database.db, expire: () => { now += 10 * 60 * 1000 + 1 }}
}

async function picture(color = 'red', width = 1200) {
    const bytes = await sharp({create: {width, height: 600, channels: 3, background: color}}).png().toBuffer()
    return 'data:image/png;base64,' + bytes.toString('base64')
}

function client(app, stored = new Map(), files = new Map()) {
    let requests = 0
    const platform = {
        env: {USER_DATA_PATH: '/local'},
        getStorageSync: key => stored.get(key), setStorageSync: (key, value) => stored.set(key, value),
        chooseImage: options => options.success({tempFilePaths: ['/temp/photo.png'], tempFiles: [{size: 1000}]}),
        arrayBufferToBase64: value => Buffer.from(value).toString('base64'),
        getFileSystemManager: () => ({
            readFile: options => options.success({data: files.get(options.filePath)}),
            writeFile: options => { files.set(options.filePath, options.data); options.success() },
            unlink: options => { files.delete(options.filePath); options.success?.() }
        }),
        request: options => {
            requests++
            if (!app) throw new Error('单人图片操作不应访问服务端')
            const url = options.url.replace('http://relay', '')
            void app.inject({method: options.method || 'GET', url, payload: options.data}).then(response => {
                options.success({statusCode: response.statusCode, data: options.responseType === 'arraybuffer'
                    ? response.rawPayload.buffer.slice(response.rawPayload.byteOffset, response.rawPayload.byteOffset + response.rawPayload.length)
                    : response.body ? response.json() : undefined})
            }).catch(options.fail)
        }
    }
    const {ProductImageClient} = loadModule('infrastructure/media/ProductImageClient', platform)
    return {media: new ProductImageClient('http://relay'), requests: () => requests, stored, files}
}

test('个人照片仅持久化到本机，选择、保存和重启读取均不需要服务端', async () => {
    const local = client()
    const data = await picture()
    local.files.set('/temp/photo.png', data.split(',')[1])
    await local.media.initialize()
    const selected = await local.media.chooseLocal()
    assert.equal(selected, data)
    await local.media.saveRestaurant('mine', [{id: 'shrimp', coverUrl: selected}])
    const path = local.media.cover({id: 'mine', type: 'PRIVATE'}, 'shrimp')
    assert.ok(path.startsWith('/local/product-'))
    assert.equal(local.requests(), 0)
    const reopened = client(undefined, local.stored, local.files)
    await reopened.media.initialize()
    assert.equal(reopened.media.cover({id: 'mine', type: 'PRIVATE'}, 'shrimp'), path)
    assert.equal(await reopened.media.local.dataUrl(path), data)
    assert.equal(reopened.requests(), 0)
})

test('房间共享时才上传个人照片；更新、重建可读取展示数据，业务事件不包含图片细节', async t => {
    const {app, db} = await fixture(t)
    const room = (await app.inject({method: 'POST', url: '/rooms'})).json()
    const local = client(app)
    await local.media.saveRestaurant('buffet', [{id: 'shrimp', coverUrl: await picture()}])
    const host = await new DiningScenario.Meal(undefined, 'host', true, local.media).givenRestaurant()
    t.after(host.app.dispose)
    assert.equal(await db.roomProductImage.count(), 0)
    await host.createRoom(room.roomId, room.code, 20000)
    assert.equal(await db.roomProductImage.count(), 1)
    const guestMedia = client(app).media
    const guest = new DiningScenario.Meal(host.relay, 'guest')
    t.after(guest.app.dispose)
    await guest.initialize()
    await guest.joinRoom(room.roomId)
    await guestMedia.refresh(room.roomId)
    const restaurant = guest.dining.restaurants()[0], product = restaurant.products[0]
    const first = guestMedia.cover(restaurant, product.id, room.roomId)
    assert.ok(first.includes(`/rooms/${room.roomId}/product-images/buffet/shrimp/`))
    let response = await app.inject({url: first.replace('http://relay', '')})
    assert.equal(response.statusCode, 200)
    assert.equal((await sharp(response.rawPayload).metadata()).width, 800)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    assert.ok(!/coverUrl|emoji|data:image/.test(JSON.stringify(host.relay.streams.get(room.roomId))))
    assert.ok(!/coverUrl|emoji|data:image/.test(JSON.stringify(host.relay.catalogs.get(room.roomId))))
    await local.media.saveRestaurant('buffet', [{id: 'shrimp', coverUrl: await picture('blue')}])
    await host.givenRestaurant({version: 2})
    await guest.app.runtime.synchronize(room.roomId)
    await guest.app.runtime.rebuild(room.roomId)
    await guestMedia.refresh(room.roomId)
    assert.notEqual(guestMedia.cover(restaurant, product.id, room.roomId), first)
    assert.equal(await db.roomProductImage.count(), 1)
    await local.media.saveRestaurant('buffet', [{id: 'shrimp'}])
    await host.givenRestaurant({version: 3})
    await guestMedia.refresh(room.roomId)
    assert.equal(guestMedia.cover(restaurant, product.id, room.roomId), '')
    assert.equal(await db.roomProductImage.count(), 0)
})

test('房间回收同时删除临时照片，公共照片继续可用，离线本机原图仍保留', async t => {
    const {app, db, expire} = await fixture(t)
    const room = (await app.inject({method: 'POST', url: '/rooms'})).json()
    const local = client(app)
    await local.media.saveRestaurant('mine', [{id: 'p', coverUrl: await picture()}])
    const original = local.media.local.get('mine', 'p')
    await local.media.share(room.roomId, 'mine', ['p'])
    const images = (await app.inject({url: `/rooms/${room.roomId}/product-images`})).json()
    assert.equal(images.length, 1)
    expire()
    assert.equal((await app.inject({url: images[0].url})).statusCode, 404)
    assert.equal(await db.roomProductImage.count(), 0)
    assert.equal(local.media.local.get('mine', 'p'), original)
    assert.equal((await app.inject({url: '/sample-images/pizza.jpg'})).statusCode, 200)
    assert.equal((await app.inject({method: 'POST', url: '/product-images/p', payload: {}})).statusCode, 404)
})

test('临时图片拒绝伪造、超限数据和无效外链；房间、餐厅及商品之间隔离', async t => {
    const {app} = await fixture(t)
    const room = (await app.inject({method: 'POST', url: '/rooms'})).json()
    const url = `/rooms/${room.roomId}/product-images/mine/p`
    assert.equal((await app.inject({method: 'POST', url, payload: {dataUrl: 'data:image/png;base64,bm90LWFuLWltYWdl'}})).statusCode, 400)
    assert.equal((await app.inject({method: 'POST', url, payload: {dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+'}})).statusCode, 400)
    const oversized = 'data:image/png;base64,' + Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64')
    assert.equal((await app.inject({method: 'POST', url, payload: {dataUrl: oversized}})).statusCode, 413)
    assert.equal((await app.inject({method: 'POST', url, payload: {url: 'javascript:alert(1)'}})).statusCode, 400)
    const saved = await app.inject({method: 'POST', url, payload: {dataUrl: await picture()}})
    assert.equal(saved.statusCode, 201, saved.body)
    assert.equal((await app.inject({url: saved.json().url.replace('/mine/p/', '/mine/other/')})).statusCode, 404)
    const other = (await app.inject({method: 'POST', url: '/rooms'})).json()
    assert.equal((await app.inject({url: saved.json().url.replace(room.roomId, other.roomId)})).statusCode, 404)
    assert.equal((await app.inject({method: 'POST', url: `/rooms/missing/product-images/mine/p`, payload: {dataUrl: await picture()}})).statusCode, 404)
})

test('UI 封面单独保存和移除，餐厅领域快照与事件只保留业务字段', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    const page = app.setup('custom-menu')
    t.after(page.dispose)
    await page.ready
    page.state.restaurant.value.name = '图片测试餐厅'
    page.state.editCategory()
    page.state.form.value.name = '海鲜'
    page.state.applyForm()
    page.state.editProduct()
    const id = page.state.form.value.draftId
    page.state.form.value.name = '鲜虾'
    page.state.form.value.price = '18'
    page.state.form.value.coverUrl = 'https://example.com/shrimp.jpg'
    page.state.applyForm()
    await page.state.saveAll()
    const restaurantId = page.state.restaurant.value.id
    assert.equal(app.services.catalog.restaurant(restaurantId).products[0].coverUrl, undefined)
    const reopened = app.setup('custom-menu', {restaurantId})
    t.after(reopened.dispose)
    await reopened.ready
    reopened.state.editProduct(id)
    assert.equal(reopened.state.form.value.coverUrl, 'https://example.com/shrimp.jpg')
    reopened.state.form.value.coverUrl = ''
    reopened.state.applyForm()
    await reopened.state.saveAll()
    const again = app.setup('custom-menu', {restaurantId})
    t.after(again.dispose)
    await again.ready
    assert.equal(again.state.restaurant.value.products[0].coverUrl, '')
    const dirty = DiningScenario.restaurant({products: [{id: 'p', name: '菜品', categoryId: 'seafood', priceMinor: 100, coverUrl: 'https://example.com/a.jpg', emoji: '🍤'}]})
    const event = Restaurant.publish(dirty)
    assert.ok(!/coverUrl|emoji/.test(JSON.stringify(event)))
    const sample = page.state.productImages.cover({id: 'niuniu', type: 'PUBLIC'}, 'beef')
    assert.equal(sample, 'http://relay.test/sample-images/steak.jpg')
})

test('旧服务端个人图片先持久化到本机，再删除旧文件；后续启动不会恢复主动移除的图片', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'buffet-image-migration-'))
    const database = await RelaySpec.database()
    const app = await RelayServer.create(database.db, {legacyImageDirectory: directory})
    t.after(async () => { await app.close(); await database.dispose(); await rm(directory, {recursive: true, force: true}) })
    const original = await sharp({create: {width: 20, height: 20, channels: 3, background: 'red'}}).webp().toBuffer()
    const digest = createHash('sha256').update(original).digest('hex')
    const folder = join(directory, createHash('sha256').update('p').digest('hex'))
    await mkdir(folder)
    const filename = join(folder, digest + '.webp')
    await writeFile(filename, original)
    const source = `/product-images/p/${digest}.webp`
    const records = [{id: 'mine', type: 'PRIVATE', products: [{id: 'p', coverUrl: source}]}]
    records.push({id: 'another', type: 'PRIVATE', products: [{id: 'reused', coverUrl: source}]})
    const local = client(app)
    const save = local.media.local.set.bind(local.media.local)
    let fail = true
    t.mock.method(local.media.local, 'set', async (...args) => {
        if (fail) { fail = false; throw new Error('DISK_FULL') }
        return save(...args)
    })
    await local.media.importLegacy(records)
    assert.deepEqual(await readFile(filename), original)
    await local.media.importLegacy(records)
    assert.equal(await local.media.local.dataUrl(local.media.local.get('mine', 'p')), 'data:image/webp;base64,' + original.toString('base64'))
    assert.equal(await local.media.local.dataUrl(local.media.local.get('another', 'reused')), 'data:image/webp;base64,' + original.toString('base64'))
    await assert.rejects(readFile(filename), {code: 'ENOENT'})
    await local.media.saveRestaurant('mine', [{id: 'p'}])
    await local.media.importLegacy(records)
    assert.equal(local.media.local.get('mine', 'p'), '')
})
