const test=require('node:test')
const assert=require('node:assert/strict')
const {loadModule}=require('../helpers/runtime.cjs')

test('长按满0.5秒打开，系统350ms长按不提前打开，原手势松开不关闭',()=>{
    const cache=new Map()
    const {useLongPressAction}=loadModule('ui/composables/useLongPressAction',{},cache)
    const {useBackdropDismiss}=loadModule('ui/composables/useBackdropDismiss',{},cache)
    let time=1000,opened=0,closed=0,mask
    const press=useLongPressAction(()=>{opened++;mask=useBackdropDismiss(()=>closed++,()=>time)},()=>time)
    press.start();time+=350;press.longPress()
    assert.equal(opened,0)
    time+=150;press.longPress()
    assert.equal(opened,1)
    time+=5000
    mask.end({type:'touchend'});press.end()
    mask.start({type:'mousedown'});mask.end({type:'mouseup'})
    assert.equal(closed,0)
    mask.start({type:'touchstart'});mask.end({type:'touchend'})
    assert.equal(closed,1)
})

test('普通点击和取消不打开，重复长按事件及松手不重复打开弹窗',()=>{
    const {useLongPressAction}=loadModule('ui/composables/useLongPressAction')
    let opened=0
    let time=1000
    const press=useLongPressAction(()=>opened++,()=>time)
    press.start();press.end()
    press.start();press.cancel();press.longPress();press.end()
    assert.equal(opened,0)
    press.start();time+=500;press.longPress();press.longPress()
    assert.equal(opened,1)
    press.end();press.end()
    assert.equal(opened,1)
})

test('没有系统长按事件也会在0.5秒打开，提前松开、滑动或取消不打开',t=>{
    t.mock.timers.enable({apis:['setTimeout']})
    const {useLongPressAction}=loadModule('ui/composables/useLongPressAction')
    let opened=0
    const press=useLongPressAction(()=>opened++)
    const start=()=>press.start({touches:[{clientX:10,clientY:10}]})
    start();t.mock.timers.tick(499)
    assert.equal(opened,0)
    t.mock.timers.tick(1)
    assert.equal(opened,1)
    press.end()
    start();t.mock.timers.tick(499);press.end();t.mock.timers.tick(1)
    assert.equal(opened,1)
    start();press.move({touches:[{clientX:10,clientY:40}]});t.mock.timers.tick(500)
    assert.equal(opened,1)
    start();press.cancel();t.mock.timers.tick(500)
    assert.equal(opened,1)
})
