const test = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('../../server/node_modules/sharp')
const {loadModule} = require('../helpers/runtime.cjs')
const {pageHarness} = require('../helpers/pages.cjs')

for (const [width, height] of [[600, 200], [200, 600], [20, 10]]) {
    test(`${width}×${height} 封面按 aspectFill 裁剪，本地结果为 100×100 且无黑边`, async () => {
        const side = Math.min(width, height)
        const center = await sharp({create: {width: side, height: side, channels: 3, background: 'red'}}).png().toBuffer()
        const original = await sharp({create: {width, height, channels: 3, background: 'black'}})
            .composite([{input: center, left: (width - side) / 2, top: (height - side) / 2}]).png().toBuffer()
        let crop, fill
        const stored = new Map()
        const context = {setFillStyle: color => { fill = color }, fillRect: () => {}, draw: (_, done) => done(),
            drawImage: (...args) => { crop = args }}
        const platform = {
            getStorageSync: key => stored.get(key), setStorageSync: (key, value) => stored.set(key, value),
            chooseImage: options => options.success({tempFilePaths: ['original.png'], tempFiles: [{size: original.length}]}),
            getImageInfo: async options => {
                const bytes = options.src.startsWith('data:') ? Buffer.from(options.src.split(',')[1], 'base64') : original
                const info = await sharp(bytes).metadata()
                options.success({width: info.width, height: info.height, path: options.src})
            },
            createCanvasContext: () => context,
            canvasToTempFilePath: async options => {
                assert.equal(options.destWidth, 100); assert.equal(options.destHeight, 100)
                const buffer = await sharp(original).extract({left: crop[1], top: crop[2], width: crop[3], height: crop[4]})
                    .resize(100, 100).flatten({background: 'white'}).jpeg().toBuffer()
                options.success({tempFilePath: 'data:image/jpeg;base64,' + buffer.toString('base64')})
            },
            request: () => { throw new Error('本机封面处理不得访问服务端') }
        }
        const cache = new Map()
        const {useProductCover} = loadModule('ui/composables/useProductCover', platform, cache)
        const {ProductImageClient} = loadModule('infrastructure/media/ProductImageClient', platform, cache)
        const cover = useProductCover(), media = new ProductImageClient('http://relay')
        const selected = await media.chooseLocal(cover.render)
        await media.saveRestaurant('mine', [{id: 'p', coverUrl: selected}], cover.render)
        const source = media.local.get('mine', 'p')
        const result = Buffer.from(source.split(',')[1], 'base64')
        const metadata = await sharp(result).metadata()
        assert.equal(metadata.width, 100); assert.equal(metadata.height, 100)
        assert.equal(fill, '#ffffff')
        assert.deepEqual(crop.slice(1), [(width - side) / 2, (height - side) / 2, side, side, 0, 0, 100, 100])
        const {data, info} = await sharp(result).raw().toBuffer({resolveWithObject: true})
        for (const [x, y] of [[0, 0], [99, 0], [0, 99], [99, 99]]) {
            const offset = (y * 100 + x) * info.channels
            assert.ok(data[offset] > 200 && data[offset + 1] < 30 && data[offset + 2] < 30)
        }
    })
}

test('创造者新建菜单默认拥有默认分类，新商品可直接使用，重开不会重复添加', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    const page = app.setup('custom-menu')
    t.after(page.dispose)
    await page.ready
    assert.equal(page.state.restaurant.value.categories.length, 1)
    assert.equal(page.state.restaurant.value.categories[0].name, '默认')
    const categoryId = page.state.restaurant.value.categories[0].id
    page.state.restaurant.value.name = '我的餐厅'
    page.state.editProduct()
    page.state.form.value.name = '鲜虾'; page.state.form.value.price = '15'
    page.state.applyForm()
    await page.state.saveAll()
    const restaurantId = page.state.restaurant.value.id
    assert.equal(app.services.catalog.restaurant(restaurantId).products[0].categoryId, categoryId)
    const reopened = app.setup('custom-menu', {restaurantId})
    t.after(reopened.dispose)
    await reopened.ready
    assert.deepEqual(JSON.parse(JSON.stringify(reopened.state.restaurant.value.categories)), [{id: categoryId, name: '默认'}])
})
