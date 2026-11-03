const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule} = require('../helpers/runtime.cjs')
const useBackdropDismiss = (...args) => loadModule('ui/components/app-dialog/useBackdropDismiss').useBackdropDismiss(...args)

test('没有在遮罩按下时，单独松开不会关闭', () => {
    let closed = 0
    const mask = useBackdropDismiss(() => closed++)
    mask.end({type: 'mouseup'})
    mask.end({type: 'touchend'})
    assert.equal(closed, 0)
})

test('鼠标在遮罩按下并松开关闭一次，离开遮罩或右键不关闭', () => {
    let closed = 0
    const mask = useBackdropDismiss(() => closed++, () => 100000)
    mask.start({type: 'mousedown', button: 0});
    mask.end({type: 'mouseup', button: 0})
    assert.equal(closed, 1)
    mask.end({type: 'mouseup', button: 0})
    assert.equal(closed, 1)
    mask.start({type: 'mousedown', button: 0});
    mask.cancel();
    mask.end({type: 'mouseup', button: 0})
    mask.start({type: 'mousedown', button: 2});
    mask.end({type: 'mouseup', button: 2})
    assert.equal(closed, 1)
})

test('触摸在遮罩按下和松开才关闭，滑动、取消、多指及混合输入不关闭', () => {
    let closed = 0
    const mask = useBackdropDismiss(() => closed++)
    const down = {type: 'touchstart', touches: [{clientX: 10, clientY: 10}]}
    mask.start(down);
    mask.move({type: 'touchmove', touches: [{clientX: 50, clientY: 10}]});
    mask.end({type: 'touchend'})
    mask.start(down);
    mask.cancel();
    mask.end({type: 'touchend'})
    mask.start({...down, touches: [...down.touches, ...down.touches]});
    mask.end({type: 'touchend'})
    mask.start(down);
    mask.end({type: 'mouseup'})
    assert.equal(closed, 0)
    mask.start(down);
    mask.end({type: 'touchend'})
    assert.equal(closed, 1)
})

test('触摸松开后合成的鼠标事件不重复关闭，之后真实鼠标操作正常', () => {
    let time = 1000, closed = 0
    const mask = useBackdropDismiss(() => closed++, () => time)
    mask.end({type: 'touchend'})
    mask.start({type: 'mousedown'});
    mask.end({type: 'mouseup'})
    assert.equal(closed, 0)
    time += 1000
    mask.start({type: 'mousedown'});
    mask.end({type: 'mouseup'})
    assert.equal(closed, 1)
})
