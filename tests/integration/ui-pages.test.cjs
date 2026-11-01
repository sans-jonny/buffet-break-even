const test = require('node:test')
const assert = require('node:assert/strict')
const {pageHarness} = require('../helpers/pages.cjs')

const examples = {
  setup:'准备吃垮老板', menu:'牛上脑', mine:'小羊同学', creator:'我的自助餐厅',
  'custom-menu':'牛上脑', 'order-slip':'牛上脑', result:'成功回本',
  receipts:'BUFFET-CALC', records:'点餐明细', 'record-detail':'牛上脑'
}
for (const [name,content] of Object.entries(examples)) {
  test(`${name} 可直接渲染示例界面，不需要数据服务`,async () => {
    const html = await pageHarness().render(name)
    assert.ok(html.includes(content))
  })
}

test('非默认状态保留多人面板、购物车、入房间和小票预览弹窗',async () => {
  const menu = await pageHarness().render('menu',s => {s.hasRoom.value = true; s.showCart.value = true})
  assert.ok(menu.includes('123456'))
  assert.ok(menu.includes('饭搭子'))
  assert.ok(menu.includes('朋友'))
  assert.ok(menu.includes('本轮待选'))
  const setup = await pageHarness().render('setup',s => {s.openRoom(); s.openJoinRoom()})
  assert.ok(setup.includes('六位房间号'))
  const result = await pageHarness().render('result',s => {s.printComplete.value = true; s.openReceiptPreview()})
  assert.equal((result.match(/PAGER MESSAGE/g) || []).length,2)
})

test('菜单保留筛选和路由，业务按钮不修改点单或票价数据',async t => {
  const harness = pageHarness()
  const {state:s,dispose} = harness.setup('menu'); t.after(dispose)
  s.selectCategory('饮品甜点')
  assert.equal(s.filteredProducts.value[0].name,'冰淇淋')
  const selected = JSON.stringify(s.selected.value)
  const lines = JSON.stringify(s.selectedLines.value)
  s.addItem('dessert'); s.removeItem('beef')
  assert.equal(JSON.stringify(s.selected.value),selected)
  assert.equal(JSON.stringify(s.selectedLines.value),lines)
  assert.equal(s.totalSelectedCount.value,7)
  s.selectRestaurant('daniu')
  assert.equal(s.restaurantId.value,'daniu')
  s.editPrice(); s.priceInput.value = '288'; s.savePrice()
  assert.equal(s.ticketPrice.value,200)
  assert.equal(s.displayValue.value,248)
  const host = s.room.value.hostId
  s.transferHost({id:'member-2'})
  assert.equal(s.room.value.hostId,host)
  await s.openOrderSlip(); await s.finish(); await s.openTab('mine')
  assert.deepEqual(harness.calls,[['toOrderSlip'],['toResult'],['open','mine','replace']])
})

test('昵称和删除记录只保留业务入口，展示和弹窗继续可用',async t => {
  const mine = pageHarness().setup('mine'); t.after(mine.dispose)
  mine.state.editNickname(); mine.state.nicknameInput.value = '新的昵称'; mine.state.saveNickname()
  assert.equal(mine.state.nickname.value,'小羊同学')
  assert.equal(mine.state.editingNickname.value,true)
  const detail = pageHarness().setup('record-detail',{recordId:'unknown-id'}); t.after(detail.dispose)
  assert.equal(detail.state.receipt.value.id,'unknown-id')
  const before = JSON.stringify(detail.state.receipt.value)
  detail.state.confirmDelete(); detail.state.confirmation.confirm()
  assert.equal(JSON.stringify(detail.state.receipt.value),before)
})

test('编辑表单、离开提示、预览和记录折叠仍是独立的 UI 行为',async t => {
  const harness = pageHarness()
  const editor = harness.setup('custom-menu',{restaurantId:'custom-id'}); t.after(editor.dispose)
  const s = editor.state
  assert.equal(s.restaurant.value.id,'custom-id')
  const before = JSON.stringify(s.restaurant.value)
  s.editProduct('beef'); s.form.value.name = '展示菜品'; s.applyForm()
  assert.equal(JSON.stringify(s.restaurant.value),before)
  assert.ok(s.form.value)
  s.isDirty.value = true; s.goBack()
  assert.equal(s.showLeaveDialog.value,true)
  s.saveAndLeave(); s.discardAndLeave()
  assert.deepEqual(harness.calls,[])
  s.isDirty.value = false; s.showLeaveDialog.value = false
  await s.goBack(); await s.previewRestaurant(s.restaurant.value)
  assert.deepEqual(harness.calls,[['back','creator'],['toMenuPreview','custom-id']])
  const records = pageHarness().setup('records'); t.after(records.dispose)
  const id = records.state.records.value[0].id
  records.state.toggleRecord(id); assert.equal(records.state.expandedRecordId.value,id)
  records.state.toggleRecord(id); assert.equal(records.state.expandedRecordId.value,null)
})

test('结果页保留打印结束反馈、预览弹窗和带参数的收藏视图',async t => {
  const result = pageHarness().setup('result'); t.after(result.dispose)
  const s = result.state
  assert.equal(s.isPrinting.value,true)
  s.openReceiptPreview(); assert.equal(s.showReceiptPreview.value,false)
  s.onPrintEnd({animationName:'receipt-feed'})
  assert.equal(s.isPrinting.value,false)
  s.openReceiptPreview(); assert.equal(s.showReceiptPreview.value,true)
  const saved = pageHarness().setup('result',{receiptId:'saved-demo'}); t.after(saved.dispose)
  assert.equal(saved.state.isSavedView.value,true)
  assert.equal(saved.state.displayReceipt.value.id,'saved-demo')
  assert.equal(saved.state.isPrinting.value,false)
})

test('结果页五种展示模式保持操作文案，收藏视图不显示保存按钮',async () => {
  for (const [mode,label] of Object.entries({
    single:'结束用餐','room-host':'结束整桌用餐','room-member':'继续用餐','room-ended':'返回首页',saved:'删除收藏'
  })) {
    const html = await pageHarness().render('result',s => {s.viewMode.value = mode})
    assert.ok(html.includes(label),mode)
    assert.equal((html.match(/存到小票夹/g) || []).length,mode === 'saved' ? 0 : 1,mode)
  }
})

test('结算、收藏和删除不模拟业务成功，已结束视图保留返回路由',async t => {
  const harness = pageHarness()
  const {state:s,dispose} = harness.setup('result'); t.after(dispose)
  const before = JSON.stringify(s.displayReceipt.value)
  s.viewMode.value = 'room-host'
  s.secondaryAction.value.run(); s.confirmation.confirm()
  assert.equal(s.viewMode.value,'room-host')
  s.endDining(); s.confirmation.confirm()
  s.save(); s.confirmDelete(); s.confirmation.confirm()
  assert.equal(JSON.stringify(s.displayReceipt.value),before)
  assert.deepEqual(harness.calls,[])
  s.viewMode.value = 'room-ended'
  await s.secondaryAction.value.run()
  assert.deepEqual(harness.calls,[['open','setup','reset']])
})

test('餐厅分类和商品的提交、删除接口不修改展示数据或执行校验',async t => {
  const harness = pageHarness()
  const {state:s,dispose} = harness.setup('custom-menu'); t.after(dispose)
  const before = JSON.stringify(s.restaurant.value)
  s.editCategory(); s.form.value.name = ''; s.applyForm()
  assert.ok(s.form.value)
  s.editProduct('beef'); s.form.value.price = 'invalid'; s.applyForm()
  s.deleteEntry(); s.confirmation.confirm()
  s.removeCategory('meat'); s.saveAll()
  assert.equal(JSON.stringify(s.restaurant.value),before)
  assert.deepEqual(harness.toasts,[])
  const creatorHarness = pageHarness()
  const creator = creatorHarness.setup('creator'); t.after(creator.dispose)
  creator.state.remove('custom-demo'); creator.state.confirmation.confirm()
  assert.equal(creator.state.restaurants.value.length,1)
  const startHarness = pageHarness()
  const setup = startHarness.setup('setup'); t.after(setup.dispose)
  setup.state.startSingle(); setup.state.createRoom(); setup.state.joinRoom(); setup.state.resumeRoom()
  assert.deepEqual(startHarness.calls,[])
  const orderHarness = pageHarness()
  const order = orderHarness.setup('order-slip'); t.after(order.dispose)
  order.state.completeRound()
  assert.deepEqual(orderHarness.calls,[])
})
