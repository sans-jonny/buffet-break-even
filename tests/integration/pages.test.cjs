const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const vue = require('vue')
const { createPinia, setActivePinia } = require('pinia')
const root = path.resolve(__dirname, '../../src')

// 编译真实页面脚本，用平台边界替身验证事件接线；不模拟真实浏览器布局。
function harness(options = {}) {
  const cache = new Map()
  const services = new Map()
  const hooks = { onLaunch: [], onLoad: [], onShow: [], onHide: [], onUnload: [], onBackPress: [] }
  const toasts = []
  const modals = []
  const navigation = []
  const storage = new Map()
  const platform = {
    getStorageSync: key => { if (options.failRead?.()) throw Error('unavailable'); return storage.get(key) },
    setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))),
    showToast: options => toasts.push(options.title),
    showModal: options => {modals.push(options.title); throw Error('页面应使用 app-dialog')},
    getSystemInfoSync: () => ({ statusBarHeight: 0 }), upx2px: value => value
  }
  function load(file) {
    file = path.resolve(root, file)
    if (fs.existsSync(path.join(file, 'index.ts'))) file = path.join(file, 'index.ts')
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!path.extname(file)) file += '.ts'
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    let source = fs.readFileSync(file, 'utf8')
    if (file.endsWith('.vue')) {
      const descriptor = parse(source, { filename: file }).descriptor
      source = compileScript(descriptor, { id: file }).content
    }
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } })
    vm.runInNewContext(outputText, { module, exports: module.exports, uni: platform, Error,
      setTimeout: options.setTimeout || setTimeout, clearTimeout: options.clearTimeout || clearTimeout,
      require(name) {
        if (name === 'vue') return { ...vue, inject: token => services.get(token) }
        if (name === '@dcloudio/uni-app') return { onLaunch: callback => hooks.onLaunch.push(callback), onLoad: callback => hooks.onLoad.push(callback), onShow: callback => hooks.onShow.push(callback), onHide: callback => hooks.onHide.push(callback), onUnload: callback => hooks.onUnload.push(callback), onBackPress: callback => hooks.onBackPress.push(callback) }
        if (name.endsWith('.vue')) return { default: {} }
        if (name.startsWith('@/')) return load(name.slice(2))
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name))
        return require(name)
      }
    }, { filename: file })
    return module.exports
  }
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = load('ui/stores/useDiningStore').useDiningStore(pinia)
  load('ui/composition/registerApplication').registerApplication({ provide: (token, service) => services.set(token, service) }, pinia)
  const nav = Object.fromEntries(['open', 'toOrderSlip', 'toResult', 'toRecord', 'toCustomMenu', 'toMenuPreview', 'back'].map(method => [method, async (...args) => { navigation.push([method, ...args]) }]))
  services.set(load('ui/navigation/BuffetNavigation').BuffetNavigation, nav)
  const bootstrap = services.get(load('ui/composition/ApplicationBootstrap').ApplicationBootstrap.Token)
  bootstrap.initialize()
  const room = load('ui/stores/useRoomStore').useRoomStore(pinia)
  const profile = load('ui/stores/useProfileStore').useProfileStore(pinia)
  return { store, room, profile, storage, bootstrap, status: load('ui/stores/useApplicationStore').useApplicationStore(pinia), history: load('ui/stores/useHistoryStore').useHistoryStore(pinia), collection: load('ui/stores/useCollectionStore').useCollectionStore(pinia), navigation, toasts, hooks,
    modals,
    stubRoom(execute) {services.set(load('contexts/dining/room/public').RoomInput.Token, {execute})},
    presentRoom(snapshot, memberId = 'host-1') {
      const products = services.get(load('contexts/catalog/public').GetCatalogInput.Token).execute({}).products
        .map(product => ({...product, ...load('presentation/dining/productAppearance').productAppearance(product.id)}))
      new (load('contexts/dining/room/infrastructure/presentation/RoomPresenter').RoomPresenter)(room, products).present(snapshot, memberId, 'online', '', false, true, false, services.get(load('contexts/catalog/public').GetCatalogInput.Token).execute({typeId: 'sukiyaki'}).catalog, 'niuniu')
    },
    page: file => load(`ui/pages/${file}/index.vue`).default.setup({}, { expose: () => {} }),
    app: () => load('ui/App.vue').default.setup({}, {expose:()=>{}}),
    input: name => services.get(load('contexts/' + ({ CompleteDining: 'dining/completion', SaveDiningReceipt:'dining/completion', DeleteRecord: 'dining/history', DeleteReceipt: 'dining/collection', GetMenu: 'catalog', GetCatalog: 'catalog', EditCatalog: 'catalog' }[name] || 'dining/session') + '/public')[name + 'Input'].Token) }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await vue.nextTick() }
const settle = async () => {for (let i = 0; i < 6; i++) await flush()}
const roomSnapshot = (extra = {}) => ({id: 'shared-room-1', code: '123456', revision: 7, hostId: 'host-1', status: 'active',
  ticketPrice: 288, typeId: 'sukiyaki', drafts: {niuniu: {selected: {'niuniu-p1-1': 2}, rounds: []}}, members: [{id: 'host-1', nickname: '团长', online: true}], receipt: null, ...extra})

test('应用启动时为新用户保存随机昵称，打开我的页面后保持一致', async () => {
  const app=harness()
  const nickname=app.storage.get('buffet-profile-nickname-v1')
  assert.equal(typeof nickname,'string')
  assert.equal(nickname.length,6)
  assert.equal(app.profile.nickname,nickname)
  app.page('mine')
  app.hooks.onShow.at(-1)()
  await settle()
  assert.equal(app.profile.nickname,nickname)
})

test('setup 滚筒选中种类用于新用餐，创造者和我的餐厅分为独立入口', async () => {
  const app=harness(),setup=app.page('setup')
  setup.drum.choose(3)
  assert.equal(setup.typeId.value,'hotpot')
  setup.start('单人')
  await settle()
  assert.equal(app.store.view.session.catalog.typeId,'hotpot')
  setup.editMenus()
  await settle()
  assert.deepEqual(app.navigation.at(-1),['open','creator'])
  setup.openMyRestaurants()
  await settle()
  assert.equal(setup.typeId.value,'my-restaurants')
  assert.ok(setup.cuisineTypes.some(t=>t.id==='creator'))
  assert.ok(setup.cuisineTypes.some(t=>t.id==='my-restaurants'))
  assert.equal(setup.cuisineTypes.some(t=>t.id==='custom'),false)
})

test('setup 底部面板随吸附预告切换，拖动取消时恢复且保留门票输入', () => {
  const app=harness(),setup=app.page('setup')
  setup.ticketInput.value='288'
  setup.drum.begin({clientX:200})
  setup.drum.move({clientX:250})
  assert.equal(setup.panelTypeId.value,'creator')
  assert.equal(setup.typeId.value,'sukiyaki')
  setup.drum.end({type:'touchcancel'})
  assert.equal(setup.panelTypeId.value,'sukiyaki')
  assert.equal(setup.ticketInput.value,'288')
  setup.drum.begin({clientX:200})
  setup.drum.move({clientX:250})
  setup.drum.end()
  assert.equal(setup.panelTypeId.value,'creator')
  assert.equal(setup.typeId.value,'creator')
})

test('新建餐厅编辑、预览不提前保存，保存后同时出现在创造者和我的餐厅，可用于用餐', async () => {
  const app=harness(),editor=app.page('custom-menu')
  editor.restaurant.value.name='我的私厨'
  editor.editProduct()
  editor.form.value.name='鲜切牛肉'; editor.form.value.price='12.5'
  await editor.applyForm()
  await editor.previewRestaurant(editor.restaurant.value)
  assert.equal(app.navigation.at(-1)[0],'toMenuPreview')
  assert.equal(editor.restaurant.value.products[0].unit,'份')
  assert.equal(app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants.length,0)
  const id=editor.restaurant.value.id
  const navigationCount = app.navigation.length
  await editor.saveAll()
  assert.equal(app.navigation.length,navigationCount)
  assert.equal(editor.isDirty.value,false)
  const creator=app.page('creator')
  app.hooks.onShow.at(-1)(); await settle()
  assert.equal(creator.library.restaurants.value[0].id,id)
  creator.editRestaurant(id);await settle()
  assert.deepEqual(app.navigation.at(-1),['toCustomMenu',id])
  const setup=app.page('setup')
  setup.openMyRestaurants()
  assert.equal(setup.typeId.value,'my-restaurants')
  setup.start('单人');await settle()
  assert.equal(app.store.view.session.restaurantId,id)
  assert.equal(app.store.view.session.catalog.typeId,'custom')
})

test('餐厅编辑按实际差异启用保存，保存留在当前页，未修改或改回原值可直接退出', async () => {
  const app=harness(),editor=app.page('custom-menu')
  assert.equal(editor.isDirty.value,false)
  editor.restaurant.value.name='测试餐厅'
  editor.editProduct()
  editor.form.value.name='牛肉';editor.form.value.price='20'
  await editor.applyForm()
  assert.equal(editor.isDirty.value,true)
  await editor.saveAll()
  assert.equal(editor.isDirty.value,false)
  assert.equal(app.navigation.length,0)
  const toastCount=app.toasts.length
  await editor.saveAll()
  assert.equal(app.toasts.length,toastCount)
  editor.restaurant.value.name='修改名称'
  assert.equal(editor.isDirty.value,true)
  editor.restaurant.value.name='测试餐厅'
  assert.equal(editor.isDirty.value,false)
  assert.equal(app.hooks.onBackPress.at(-1)(),false)
  await editor.goBack()
  assert.equal(editor.showLeaveDialog.value,false)
  assert.deepEqual(app.navigation.at(-1),['back','creator'])
})

test('返回时可保存并离开或放弃；保存校验或存储失败保持修改并留在编辑页', async () => {
  const app=harness(),editor=app.page('custom-menu')
  editor.restaurant.value.name='未保存餐厅'
  assert.equal(app.hooks.onBackPress.at(-1)(),true)
  assert.equal(editor.showLeaveDialog.value,true)
  await editor.saveAndLeave()
  assert.equal(app.navigation.length,0)
  assert.equal(editor.isDirty.value,true)
  assert.equal(editor.showLeaveDialog.value,true)
  editor.editProduct()
  editor.form.value.name='牛肉';editor.form.value.price='20'
  await editor.applyForm()
  const saveRestaurant=editor.library.saveRestaurant
  editor.library.saveRestaurant=()=>{throw Error('存储失败')}
  await editor.saveAndLeave()
  assert.equal(editor.saving.value,false)
  assert.equal(editor.isDirty.value,true)
  assert.equal(app.navigation.length,0)
  editor.library.saveRestaurant=saveRestaurant
  await editor.saveAndLeave()
  assert.equal(editor.isDirty.value,false)
  assert.deepEqual(app.navigation.at(-1),['back','creator'])
  editor.restaurant.value.name='放弃这个名字'
  editor.goBack()
  assert.equal(editor.showLeaveDialog.value,true)
  const persisted=app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants[0]
  await editor.discardAndLeave()
  assert.equal(persisted.name,'未保存餐厅')
  assert.equal(app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants[0].name,'未保存餐厅')
})

test('我的餐厅作为种类直接设置门票并开始，用餐包含所有已完成餐厅菜单', async () => {
  const app=harness()
  const menu=id=>({id,name:id,categories:[{id:'cat',name:'肉类'}],products:[{id:'p',name:'牛肉',category:'cat',unit:'份',price:8}],valuationNote:'个人估值',sources:['个人经验']})
  app.input('EditCatalog').execute({catalog:{typeId:'custom',typeName:'自定义',restaurants:[menu('a'),menu('b'),{...menu('empty'),products:[]}]}})
  const setup=app.page('setup')
  setup.openMyRestaurants()
  setup.ticketInput.value='168'
  setup.start('单人');await settle()
  assert.equal(app.store.view.session.ticketPrice,168)
  assert.equal(app.store.view.session.catalog.restaurants.length,2)
  assert.equal(app.store.view.session.restaurantId,'a')
  app.input('SelectRestaurant').execute({restaurantId:'b'})
  assert.equal(app.store.view.session.restaurantId,'b')
})

test('menu 预览展示未保存菜品，可浏览分类，但不加菜、改票价、下单或修改当前单人与多人状态', async () => {
  const app=harness(),requests=[]
  app.stubRoom(async request=>{requests.push(request)})
  app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
  app.presentRoom(roomSnapshot())
  const beforeSingle=JSON.stringify(app.store.view),beforeRoom=JSON.stringify(app.room.view)
  const editor=app.page('custom-menu')
  editor.restaurant.value.name='未保存菜单'
  editor.editProduct(); editor.form.value.name='虾滑';editor.form.value.price='6'
  await editor.applyForm()
  await editor.previewRestaurant(editor.restaurant.value)
  const previewId=app.navigation.at(-1)[1]
  const menu=app.page('menu')
  app.hooks.onLoad.at(-1)({previewId})
  app.hooks.onShow.at(-1)();await settle()
  assert.equal(menu.isPreview.value,true)
  assert.equal(menu.filteredProducts.value[0].name,'虾滑')
  assert.equal(menu.canCommitRound.value,false)
  assert.equal(menu.canChangePrice.value,false)
  await menu.addItem(menu.filteredProducts.value[0].id)
  await menu.removeItem(menu.filteredProducts.value[0].id)
  menu.editPrice();menu.openOrderSlip();menu.finish()
  app.hooks.onUnload.at(-1)?.();await settle()
  assert.equal(requests.length,0)
  assert.equal(JSON.stringify(app.store.view),beforeSingle)
  assert.equal(JSON.stringify(app.room.view),beforeRoom)
  assert.equal(app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants.length,0)
  assert.equal(app.history.view.records.length,0)
  const refreshed=app.page('menu')
  app.hooks.onLoad.at(-1)({previewId});await settle()
  assert.equal(refreshed.filteredProducts.value[0].name,'虾滑')
})

test('预览凭证失效返回创造者页面，不清除进行中的空单人会话', async () => {
  const app=harness()
  app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
  const id=app.store.view.session.id
  app.page('menu')
  app.hooks.onLoad.at(-1)({previewId:'missing'});await settle()
  app.hooks.onUnload.at(-1)?.();await settle()
  assert.deepEqual(app.navigation.at(-1),['back','creator'])
  assert.equal(app.store.view.session.id,id)
  assert.equal(app.store.view.session.active,true)
})

test('编辑只更新当前餐厅；旧自定义数据保留，删除配置不改变活动菜单快照', async () => {
  const app=harness()
  const menu=id=>({id,name:id,categories:[{id:'cat',name:'肉类'}],products:[{id:'p',name:'牛肉',category:'cat',unit:'80克',price:8}],valuationNote:'个人估值',sources:['个人经验']})
  app.input('EditCatalog').execute({catalog:{typeId:'custom',typeName:'自定义',restaurants:[menu('old-a'),menu('old-b')]}})
  const editor=app.page('custom-menu')
  app.hooks.onLoad.at(-1)({restaurantId:'old-a'});await settle()
  editor.restaurant.value.name='改名后的餐厅'
  await editor.saveAll()
  const catalog=app.input('GetCatalog').execute({typeId:'custom'}).catalog
  assert.equal(catalog.restaurants.length,2)
  assert.equal(catalog.restaurants[1].name,'old-b')
  app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人',typeId:'custom',restaurantId:'old-b'})
  const creator=app.page('creator')
  creator.remove('old-b')
  assert.equal(app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants.length,2)
  creator.confirmation.confirm();await settle()
  assert.equal(app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants.length,1)
  assert.equal(app.store.view.session.catalog.restaurants.length,2)
  assert.equal(app.store.view.session.restaurantId,'old-b')
})

test('自定义确认框取消不删除，确认只执行一次，关闭菜品删除确认仍保留编辑窗口', async () => {
  const app=harness(),editor=app.page('custom-menu')
  editor.restaurant.value.name='测试餐厅'
  editor.editProduct()
  editor.form.value.name='牛肉';editor.form.value.price='20'
  await editor.applyForm()
  await editor.saveAll()
  const productId=editor.restaurant.value.products[0].id
  editor.editProduct(productId)
  editor.deleteEntry()
  assert.equal(editor.confirmation.dialog.value.title,'确认删除')
  assert.equal(editor.restaurant.value.products.length,1)
  editor.confirmation.cancel()
  assert.equal(editor.form.value.id,productId)
  assert.equal(editor.restaurant.value.products.length,1)
  editor.deleteEntry()
  editor.confirmation.confirm()
  editor.confirmation.confirm()
  assert.equal(editor.restaurant.value.products.length,0)
  assert.equal(editor.form.value,null)
  const creator=app.page('creator')
  creator.remove(editor.restaurant.value.id)
  creator.confirmation.cancel()
  assert.equal(app.input('GetCatalog').execute({typeId:'custom'}).catalog.restaurants.length,1)
  assert.equal(app.modals.length,0)
})

test('创建自定义多人房间上传已保存目录，并在创建后选中所选餐厅', async () => {
  const app=harness(),requests=[]
  app.stubRoom(async r=>{requests.push(r)})
  const menu=id=>({id,name:id,categories:[{id:'cat',name:'肉类'}],products:[{id:'p',name:'牛肉',category:'cat',unit:'80克',price:8}],valuationNote:'个人估值',sources:['个人经验']})
  app.input('EditCatalog').execute({catalog:{typeId:'custom',typeName:'自定义',restaurants:[menu('first'),menu('second')]}})
  const setup=app.page('setup')
  app.hooks.onLoad.at(-1)({restaurantId:'second'});await settle()
  setup.enterRoom('create');await settle()
  const created=requests.find(r=>r.command==='create')
  assert.equal(created.params.typeId,'custom')
  assert.equal(created.params.catalog.restaurants.length,2)
  assert.equal(requests.find(r=>r.command==='selectRestaurant').params.restaurantId,'second')
})

test('空单人用餐切换到我的和菜单保留会话，返回 setup 后才清理且不记账', async () => {
  const app = harness()
  app.input('BeginSession').execute({ticketPrice: 100, diningMode: '单人'})
  app.page('menu')
  await app.hooks.onUnload.at(-1)?.()
  await settle()
  const id=app.store.view.session.id
  app.page('mine')
  await app.hooks.onShow.at(-1)()
  await settle()
  assert.equal(app.store.view.session.active,true)
  assert.equal(app.store.view.session.id,id)
  app.page('menu')
  await app.hooks.onShow.at(-1)()
  await settle()
  assert.equal(app.store.view.session.id,id)
  assert.equal(app.navigation.length,0)
  const setup = app.page('setup')
  await app.hooks.onShow.at(-1)()
  await settle()
  assert.equal(app.store.view.session.active, false)
  assert.equal(app.history.view.records.length, 0)
  assert.equal(app.collection.view.receipts.length, 0)
  setup.start('单人')
  await settle()
  assert.equal(app.modals.length, 0)
  assert.equal(app.store.view.session.active, true)
  assert.deepEqual(app.navigation.at(-1), ['open', 'menu'])
})

test('旧的空单人会话即使未触发卸载，也可以直接开始且不显示确认框', async () => {
  const app = harness()
  app.input('BeginSession').execute({ticketPrice: 100, diningMode: '单人'})
  const oldId = app.store.view.session.id
  const setup = app.page('setup')
  setup.start('单人')
  await settle()
  assert.equal(app.modals.length, 0)
  assert.notEqual(app.store.view.session.id, oldId)
  assert.equal(app.history.view.records.length, 0)
})

test('退出应用只清理空单人会话，有待选和已点轮次均保留',async()=>{
  for (const state of ['empty','selected','round']) {
    const app=harness()
    app.app()
    const hideApp=app.hooks.onHide.at(-1)
    app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
    if (state!=='empty') app.input('ChangeSelection').execute({productId:'beef',change:1})
    if (state==='round') app.input('CommitRound').execute({})
    app.page('mine')
    hideApp()
    await settle()
    assert.equal(app.store.view.session.active,state!=='empty')
    assert.equal(app.history.view.records.length,0)
    assert.equal(app.collection.view.receipts.length,0)
  }
})

test('应用未收到退出回调时，下次启动补清理遗留空会话',async()=>{
  const app=harness()
  app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
  app.app()
  app.hooks.onLaunch.at(-1)()
  await settle()
  assert.equal(app.store.view.session.active,false)
  assert.equal(app.history.view.records.length,0)
})

test('退出有待选或有轮次的单人用餐保留会话，重新开始仍需确认', async () => {
  for (const committed of [false, true]) {
    const app = harness()
    app.input('BeginSession').execute({ticketPrice: 100, diningMode: '单人'})
    app.input('ChangeSelection').execute({productId: 'apple', change: 1})
    if (committed) app.input('CommitRound').execute({})
    app.page('menu')
    await app.hooks.onUnload.at(-1)?.()
    await settle()
    assert.equal(app.store.view.session.active, true)
    const setup = app.page('setup')
    app.hooks.onShow.at(-1)()
    await settle()
    setup.start('单人')
    await settle()
    assert.equal(setup.confirmation.dialog.value.title,'已有进行中的用餐')
    const navigationCount=app.navigation.length
    setup.confirmation.close()
    await settle()
    assert.equal(setup.confirmation.dialog.value,null)
    assert.equal(app.navigation.length,navigationCount)
    assert.equal(app.store.view.session.active,true)
    setup.start('单人')
    setup.confirmation.cancel()
    await settle()
    assert.equal(app.store.view.session.active,true)
    assert.deepEqual(app.navigation.at(-1),['open','menu'])
  }
})

test('旧菜单卸载不会清除新建的空单人会话', async () => {
  const app = harness()
  app.input('BeginSession').execute({ticketPrice: 100, diningMode: '单人'})
  app.page('menu')
  app.input('BeginSession').execute({ticketPrice: 200, diningMode: '单人', replaceActive: true})
  const newId = app.store.view.session.id
  await app.hooks.onUnload.at(-1)?.()
  await settle()
  assert.equal(app.store.view.session.id, newId)
  assert.equal(app.store.view.session.active, true)
})

test('单人空用餐退出后创建多人房间不会被确认框阻塞，也不产生历史记录', async () => {
  const app = harness(), requests = []
  app.stubRoom(async request => {requests.push(request)})
  const first = app.page('setup')
  first.start('单人')
  await settle()
  assert.equal(first.starting.value, false)
  const returned = app.page('setup')
  app.hooks.onShow.at(-1)()
  await settle()
  returned.openRoom()
  await settle()
  returned.enterRoom('create')
  await settle()
  assert.ok(requests.some(request => request.command === 'create'))
  assert.equal(returned.starting.value, false)
  assert.equal(returned.showRoomModal.value, false)
  assert.equal(app.modals.length, 0)
  assert.deepEqual(app.navigation.at(-1), ['open', 'menu'])
  assert.equal(app.history.view.records.length, 0)
  assert.equal(app.store.view.session.active, false)
})

test('单人待选和轮次与创建、加入多人房间互不覆盖，无跨模式确认', async () => {
  for (const command of ['create','join']) {
    const app=harness(),requests=[]
    app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
    app.input('ChangeSelection').execute({productId:'apple',change:1})
    app.input('CommitRound').execute({})
    app.input('ChangeSelection').execute({productId:'beef',change:1})
    const before=JSON.stringify(app.store.view)
    app.stubRoom(async request=>{
      requests.push(request)
      if (request.command===command) app.presentRoom(roomSnapshot())
      if (['leave','suspend'].includes(request.command)) app.presentRoom(null)
    })
    const setup=app.page('setup')
    setup.roomCode.value='123456'
    setup.openRoom()
    await settle()
    setup.enterRoom(command)
    await settle()
    assert.ok(requests.some(request=>request.command===command))
    assert.equal(setup.confirmation.dialog.value,null)
    assert.equal(JSON.stringify(app.store.view),before)
    const menu=app.page('menu')
    assert.equal(menu.diningStore.view.session.diningMode,'多人')
    await menu.goBack()
    await settle()
    assert.equal(requests.at(-1).command,'suspend')
    assert.equal(app.room.view.snapshot,null)
    assert.equal(JSON.stringify(app.store.view),before)
    assert.equal(menu.diningStore.view.session.diningMode,'单人')
    assert.deepEqual(app.navigation.at(-1),['open','setup','reset'])
  }
})

test('已有单人会话也恢复当前多人连接，返回 setup 清理房间且不清理单人进度',async()=>{
  const app=harness(),requests=[]
  app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
  app.input('ChangeSelection').execute({productId:'beef',change:1})
  const before=JSON.stringify(app.store.view)
  app.stubRoom(async request=>{
    requests.push(request)
    if(request.command==='resume') app.presentRoom(roomSnapshot())
    if(['leave','suspend'].includes(request.command)) app.presentRoom(null)
  })
  const menu=app.page('menu')
  app.hooks.onShow.at(-1)()
  await settle()
  assert.equal(requests.at(-1).command,'resume')
  assert.equal(menu.diningStore.view.session.diningMode,'多人')
  const setup=app.page('setup')
  app.hooks.onShow.at(-1)()
  await settle()
  assert.equal(app.room.view.snapshot,null)
  assert.equal(JSON.stringify(app.store.view),before)
  setup.start('单人')
  assert.equal(setup.confirmation.dialog.value.title,'已有进行中的用餐')
  setup.confirmation.cancel()
  await settle()
  assert.equal(JSON.stringify(app.store.view),before)
  assert.equal(requests.at(-1).command,'suspend')
  assert.deepEqual(app.navigation.at(-1),['open','menu'])
})

test('多人入口每次先检查可用性，检查中或失效时不显示继续，有效才恢复且保留单人',async()=>{
  const app=harness(),requests=[]
  app.input('BeginSession').execute({ticketPrice:100,diningMode:'单人'})
  app.input('ChangeSelection').execute({productId:'beef',change:1})
  const before=JSON.stringify(app.store.view)
  let finishCheck
  app.stubRoom(async request=>{
    requests.push(request)
    if(request.command==='check') await new Promise(resolve=>{
      finishCheck=available=>{app.room.present({...app.room.view,resumable:available});resolve()}
    })
    if(request.command==='resume') app.presentRoom(roomSnapshot())
  })
  const setup=app.page('setup')
  app.room.present({...app.room.view,resumable:true})
  setup.openRoom()
  assert.equal(setup.checkingRoom.value,true)
  assert.equal(setup.canResumeRoom.value,false)
  finishCheck(false);await settle()
  assert.equal(setup.canResumeRoom.value,false)
  setup.enterRoom('resume');await settle()
  assert.equal(requests.some(r=>r.command==='resume'),false)
  setup.closeRoomModal()
  setup.openRoom()
  finishCheck(true);await settle()
  assert.equal(setup.canResumeRoom.value,true)
  setup.enterRoom('resume');await settle()
  assert.equal(requests.at(-1).command,'resume')
  assert.equal(requests.some(r=>r.command==='leave'),false)
  assert.equal(JSON.stringify(app.store.view),before)
  assert.deepEqual(app.navigation.at(-1),['open','menu'])
})

test('菜单点击门票可修改单人票价，多人成员不能修改票价或打开本轮点单', async () => {
  const app = harness(), requests = []
  app.stubRoom(async request => {requests.push(request)})
  app.input('BeginSession').execute({ticketPrice: 100, diningMode: '单人'})
  const menu = app.page('menu')
  menu.editPrice()
  assert.equal(menu.editingPrice.value, true)
  menu.priceInput.value = '188.88'
  await menu.savePrice()
  assert.equal(app.store.view.session.ticketPrice, 188.88)
  app.presentRoom(roomSnapshot(), 'member-2')
  assert.equal(menu.canChangePrice.value, false)
  assert.equal(menu.canCommitRound.value, false)
  menu.openOrderSlip(); await settle()
  assert.equal(app.navigation.some(([method]) => method === 'toOrderSlip'), false)
  const order = app.page('order-slip')
  order.completeRound(); await settle()
  assert.equal(requests.some(request => request.command === 'commitRound'), false)
})

test('多人入口先弹窗，创建沿用首页门票和个人昵称，并进入相同菜单页', async () => {
  const app = harness(), requests = []
  app.stubRoom(async request => {requests.push(request)})
  app.storage.set('buffet-profile-nickname-v1', '小羊')
  const setup = app.page('setup')
  setup.ticketInput.value = '328.5'
  setup.openRoom()
  await settle()
  assert.equal(setup.showRoomModal.value, true)
  assert.deepEqual(app.navigation, [])
  setup.enterRoom('create')
  await settle()
  const request = requests.find(request => request.command === 'create')
  assert.equal(request.params.ticketPrice, 328.5)
  assert.equal(request.params.nickname, '小羊')
  assert.equal(setup.showRoomModal.value, false)
  assert.deepEqual(app.navigation.at(-1), ['open', 'menu'])
})

test('加入弹窗校验六位房间号，使用个人昵称，成功进入菜单', async () => {
  const app = harness(), requests = []
  app.stubRoom(async request => {requests.push(request)})
  const setup = app.page('setup')
  setup.showRoomModal.value = true; setup.joining.value = true; setup.roomCode.value = '12'
  setup.enterRoom('join')
  await settle()
  assert.equal(requests.length, 0)
  assert.match(app.toasts.at(-1), /六位房间号/)
  setup.roomCode.value = '123456'
  setup.enterRoom('join')
  await settle()
  const request = requests.find(request => request.command === 'join')
  assert.equal(request.params.code, '123456')
  assert.equal(request.params.nickname, app.profile.nickname)
  assert.equal(request.params.nickname, app.storage.get('buffet-profile-nickname-v1'))
  assert.equal(request.params.nickname.length, 6)
  assert.deepEqual(app.navigation.at(-1), ['open', 'menu'])
})

test('共享房间复用菜单、购物车与轮次页面，不修改单人状态', async () => {
  const app = harness(), requests = []
  app.stubRoom(async request => {requests.push(request)})
  app.presentRoom(roomSnapshot())
  const menu = app.page('menu')
  assert.equal(menu.diningStore.view.displayValue, 20)
  assert.equal(menu.diningStore.view.session.ticketPrice, 288)
  assert.equal(menu.diningStore.view.selectedLines[0].count, 2)
  await menu.addItem('apple')
  assert.equal(requests.at(-1).command, 'changeSelection')
  assert.equal(requests.at(-1).params.change, 1)
  assert.equal(app.store.view.totalSelectedCount, 0)
  menu.openOrderSlip()
  await settle()
  assert.deepEqual(app.navigation.at(-1), ['toOrderSlip'])
  const order = app.page('order-slip')
  order.completeRound()
  await settle()
  assert.equal(requests.at(-1).command, 'commitRound')
  assert.equal(requests.at(-1).params.expectedRevision, 7)
  assert.deepEqual(app.navigation.at(-1), ['back', 'menu'])
})

test('我的昵称可保存且同步到当前队伍，空昵称不覆盖已有设置', async () => {
  const app = harness(), requests = []
  app.stubRoom(async request => {requests.push(request)})
  app.presentRoom(roomSnapshot())
  const mine = app.page('mine')
  mine.editNickname(); mine.nicknameInput.value = '  快乐食客  '
  await mine.saveNickname()
  assert.equal(app.profile.nickname, '快乐食客')
  assert.equal(app.storage.get('buffet-profile-nickname-v1'), '快乐食客')
  assert.equal(requests.at(-1).command, 'rename')
  assert.equal(requests.at(-1).params.nickname, '快乐食客')
  mine.editNickname(); mine.nicknameInput.value = '   '
  await mine.saveNickname()
  assert.equal(app.profile.nickname, '快乐食客')
  assert.match(app.toasts.at(-1), /昵称需/)
})

test('普通多人成员用餐中保存并覆盖个人快照，不发送房间命令或改变共享草稿', async () => {
  const app=harness(),requests=[]
  app.stubRoom(async request=>requests.push(request))
  const members=[{id:'host-1',nickname:'房主',online:true},{id:'guest-1',nickname:'小羊',online:true}]
  app.presentRoom(roomSnapshot({members}),'guest-1')
  const result=app.page('result')
  assert.equal(result.isHost.value,false)
  await result.save()
  assert.equal(app.collection.view.receipts[0].value,20)
  assert.deepEqual([...app.collection.view.receipts[0].participants],['房主','小羊'])
  assert.equal(app.room.view.snapshot.drafts.niuniu.rounds.length,0)
  assert.equal(app.room.view.snapshot.drafts.niuniu.selected['niuniu-p1-1'],2)
  app.presentRoom(roomSnapshot({members,revision:8,drafts:{niuniu:{selected:{'niuniu-p1-1':3},rounds:[]}}}),'guest-1')
  await result.save()
  assert.equal(app.collection.view.receipts.length,1)
  assert.equal(app.collection.view.receipts[0].value,30)
  assert.equal(app.collection.view.receipts[0].rounds[0].lines[0].count,3)
  assert.equal(app.history.view.records.length,0)
  assert.equal(app.navigation.length,0)
  assert.equal(requests.length,0)
})

test('多人保存个人快照不结束或离开，结束后可覆盖收藏并独立返回首页', async () => {
  const app = harness(), requests = []
  const receipt = {id: 'shared-room-1', restaurant: '牛牛 · 多人共享', date: '2026-10-23', price: 288, value: 20,
    lines: [{name: '唯可鲜富士苹果汁', count: 2, price: 10}], rounds: [{time: '12:00:00', value: 20, lines: [{name: '唯可鲜富士苹果汁', count: 2, price: 10}]}]}
  app.stubRoom(async request => {
    requests.push(request)
    if (request.command === 'end') app.presentRoom(roomSnapshot({status: 'ended', selected: {}, rounds: receipt.rounds, receipt}))
    if (['leave','suspend'].includes(request.command)) app.presentRoom(null)
  })
  app.presentRoom(roomSnapshot())
  const result = app.page('result')
  assert.equal(result.isRoomView.value, true)
  assert.equal(result.displayReceipt.value.value, 20)
  await result.save()
  assert.equal(requests.length,0)
  assert.equal(app.collection.view.receipts.length,1)
  assert.equal(app.collection.view.receipts[0].rounds[0].value,20)
  assert.equal(app.history.view.records.length,0)
  assert.equal(result.roomEnded.value,false)
  assert.equal(app.navigation.length,0)
  result.endRoom()
  assert.equal(requests.length,0)
  result.confirmation.confirm()
  await settle()
  assert.equal(requests.at(-1).command, 'end')
  assert.equal(result.roomEnded.value, true)
  await result.save()
  assert.equal(app.collection.view.receipts.length, 1)
  assert.equal(requests.at(-1).command,'end')
  assert.equal(app.navigation.length,0)
  result.goBack()
  await settle()
  assert.equal(app.collection.view.receipts[0].id, receipt.id)
  assert.equal(app.history.view.records[0].price, 288)
  assert.deepEqual(app.navigation.at(-1), ['open', 'setup', 'reset'])
})

test('多人最终结果拦截系统返回，只离开房间并回 setup；收藏详情仍返回小票夹', async () => {
  const app=harness(),requests=[]
  const receipt={id:'shared-room-1',restaurant:'牛牛',date:'2026-10-24T08:00:00Z',price:100,value:20,
    lines:[{name:'牛肉',count:2,price:10}],rounds:[{time:'2026-10-24T08:00:00Z',value:20,lines:[{name:'牛肉',count:2,price:10}]}]}
  app.stubRoom(async request=>{requests.push(request)})
  app.presentRoom(roomSnapshot({status:'ended',receipt}))
  app.page('result')
  assert.equal(app.hooks.onBackPress.at(-1)(),true)
  await settle()
  assert.equal(requests.at(-1).command,'suspend')
  assert.deepEqual(app.navigation.at(-1),['open','setup','reset'])
  app.input('SaveDiningReceipt').execute({receipt})
  const saved=app.page('result')
  saved.receiptId.value=receipt.id
  assert.equal(app.hooks.onBackPress.at(-1)(),false)
  await saved.goBack()
  assert.deepEqual(app.navigation.at(-1),['back','receipts'])
})

test('初始化失败时直接进入菜单不误跳转，重试成功后才执行会话检查', async () => {
  let fail = true
  const app = harness({failRead: () => fail})
  app.page('menu')
  for (const hook of app.hooks.onShow) await hook()
  await flush()
  assert.equal(app.status.view.status, 'error')
  assert.deepEqual(app.navigation, [])
  fail = false
  assert.equal(app.bootstrap.initialize(), true)
  await flush()
  assert.equal(app.status.view.status, 'ready')
  assert.deepEqual(app.navigation.at(-1), ['open', 'setup', 'reset'])
})

test('初始化失败时结果页不把尚未加载的收藏误判为不存在', async () => {
  let fail = true
  const app = harness({failRead: () => fail})
  const page = app.page('result')
  await app.hooks.onLoad.at(-1)({receiptId: 'missing'})
  await flush()
  assert.equal(page.receiptId.value, 'missing')
  assert.deepEqual(app.navigation, [])
  fail = false
  app.bootstrap.initialize()
  await flush()
  assert.deepEqual(app.navigation.at(-1), ['open', 'receipts', 'replace'])
})

test('初始化失败时点单页等待重试，不提前把待选误判为空', async () => {
  let fail = true
  const app = harness({failRead: () => fail})
  app.page('order-slip')
  await app.hooks.onLoad.at(-1)({})
  await flush()
  assert.deepEqual(app.navigation, [])
  fail = false
  app.bootstrap.initialize()
  await flush()
  assert.deepEqual(app.navigation.at(-1), ['open', 'menu', 'replace'])
})

test('真实页面事件从开始、菜单加减、提交到结果收藏，展示随 Presenter 更新', async () => {
  const app = harness()
  const setup = app.page('setup')
  setup.ticketInput.value = '20'
  setup.start('单人')
  await flush()
  assert.equal(app.store.view.session.ticketPrice, 20)
  assert.deepEqual(app.navigation[0], ['open', 'menu'])
  const menu = app.page('menu')
  await menu.addItem('niuniu-p1-1')
  assert.equal(menu.diningStore.view.totalSelectedCount, 1)
  assert.equal(menu.diningStore.view.displayValue, 10)
  await menu.removeItem('niuniu-p1-1')
  assert.equal(menu.diningStore.view.totalSelectedCount, 0)
  await menu.addItem('niuniu-p1-2')
  menu.selectCategory('肉类海鲜')
  assert.equal(menu.filteredProducts.value.some(product => product.id === 'niuniu-p1-1'), true)
  menu.openOrderSlip()
  await flush()
  assert.deepEqual(app.navigation.at(-1), ['toOrderSlip'])
  const order = app.page('order-slip')
  order.completeRound()
  await flush()
  assert.equal(app.store.view.session.rounds.length, 1)
  assert.equal(menu.diningStore.view.totalSelectedCount, 0)
  await menu.addItem('niuniu-p1-1')
  const result = app.page('result')
  assert.equal(result.displayReceipt.value.value, 21)
  assert.equal(app.store.view.session.rounds.length, 1)
  result.save()
  await flush()
  assert.equal(app.history.view.records.length, 0)
  assert.equal(app.store.view.session.active,true)
  assert.equal(app.store.view.session.rounds.length,1)
  assert.equal(menu.diningStore.view.totalSelectedCount,1)
  assert.equal(app.collection.view.receipts[0].value, 21)
  assert.equal(app.collection.view.receipts[0].rounds.length,2)
  assert.notEqual(app.navigation.at(-1)[0],'open')
  await menu.addItem('niuniu-p1-1')
  await result.save()
  assert.equal(app.collection.view.receipts.length,1)
  assert.equal(app.collection.view.receipts[0].value,31)
  result.endDining()
  result.confirmation.confirm()
  await flush()
  assert.equal(app.history.view.records[0].rounds.length,2)
  assert.equal(app.store.view.session.active,false)
  assert.deepEqual(app.navigation.at(-1), ['open', 'setup', 'reset'])
})

test('待保存结果在出票结束后更新打印状态，收藏详情不播放出票且状态独立', async () => {
  const app = harness()
  app.input('BeginSession').execute({ticketPrice:20,diningMode:'单人'})
  app.input('ChangeSelection').execute({productId:'beef',change:1})
  const pending = app.page('result')
  assert.equal(pending.isSavedView.value,false)
  assert.equal(pending.isPrinting.value,true)
  pending.onPrintEnd({animationName:'unrelated'})
  assert.equal(pending.printComplete.value,false)
  pending.onPrintEnd({detail:{animationName:'receipt-feed-scoped'}})
  assert.equal(pending.printComplete.value,true)
  assert.equal(pending.isPrinting.value,false)
  assert.equal(app.collection.view.receipts.length,0)
  app.input('CompleteDining').execute({collectReceipt:true})
  const saved = app.page('result')
  saved.receiptId.value = app.collection.view.receipts[0].id
  assert.equal(saved.isSavedView.value,true)
  assert.equal(saved.isPrinting.value,false)
  assert.equal(saved.printComplete.value,false)
  assert.equal(saved.displayReceipt.value.id,saved.receiptId.value)
})

test('微信缺失出票动画事件时按时解锁保存，收藏详情和退出页面清理计时', async () => {
  let timerId = 0
  const timers = new Map()
  const app = harness({setTimeout: (callback, delay) => {
    const id = ++timerId
    timers.set(id, {callback, delay})
    return id
  }, clearTimeout: id => timers.delete(id)})
  app.input('BeginSession').execute({ticketPrice:20,diningMode:'单人'})
  app.input('ChangeSelection').execute({productId:'beef',change:1})
  const pending = app.page('result')
  assert.equal(pending.isPrinting.value,true)
  assert.equal(timers.size,1)
  const timer = [...timers.values()][0]
  assert.equal(timer.delay,1500)
  pending.openReceiptPreview()
  assert.equal(app.toasts.length,0)
  timer.callback()
  await flush()
  assert.equal(pending.printComplete.value,true)
  assert.equal(pending.isPrinting.value,false)
  assert.equal(timers.size,0)
  await pending.openReceiptPreview()
  // 平台替身未提供画布；进入生成流程即可证明不再被打印状态拦截。
  assert.equal(app.toasts.length,1)
  app.input('SaveDiningReceipt').execute({})
  const saved = app.page('result')
  saved.receiptId.value = app.collection.view.receipts[0].id
  await flush()
  assert.equal(timers.size,0)
  app.page('result')
  assert.equal(timers.size,1)
  app.hooks.onUnload.at(-1)?.()
  assert.equal(timers.size,0)
})

test('页面无效输入展示错误且不导航；多个结果页的选择状态互不影响', async () => {
  const app = harness()
  const setup = app.page('setup')
  setup.ticketInput.value = '-10'
  setup.start('单人')
  await flush()
  assert.equal(app.navigation.length, 0)
  assert.equal(app.toasts.length, 1)
  assert.equal(setup.starting.value, false)
  app.input('BeginSession').execute({ ticketPrice: 20, diningMode: '单人' })
  app.input('ChangeSelection').execute({ productId: 'beef', change: 1 })
  app.input('CompleteDining').execute({ collectReceipt: true })
  const first = app.page('result')
  const second = app.page('result')
  const receiptId = app.history.view.records[0].id
  first.receiptId.value = receiptId
  assert.equal(first.displayReceipt.value.value, 8)
  assert.equal(second.receiptId.value, '')
  assert.equal(first.isSavedView.value, true)
  const detail = app.page('record-detail')
  detail.recordId.value = receiptId
  detail.confirmDelete()
  assert.equal(app.history.view.records.length,1)
  detail.confirmation.confirm()
  await flush()
  assert.equal(app.history.view.records.length, 0)
  assert.equal(app.collection.view.receipts.length, 1)
  assert.equal(detail.receipt.value, undefined)
})
