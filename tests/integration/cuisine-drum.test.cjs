const test = require('node:test')
const assert = require('node:assert/strict')
const {ref} = require('vue')
const {loadModule} = require('../helpers/runtime.cjs')
const ids = ['custom', 'sukiyaki', 'barbecue', 'hotpot', 'pizza']

function create() {
    const selected = ref('sukiyaki')
    const width = ref(375)
    let time = 1000
    const drum = loadModule('ui/components/cuisine-drum/useCuisineDrum').useCuisineDrum(ids, selected, width, () => time)
    const swipe = (dx, dy = 0) => {
        drum.begin({type: 'touchstart', touches: [{clientX: 200, clientY: 200}]})
        drum.move({type: 'touchmove', touches: [{clientX: 200 + dx, clientY: 200 + dy}]})
        drum.end({type: 'touchend', changedTouches: [{clientX: 200 + dx, clientY: 200 + dy}]})
    }
    return {
        selected, drum, swipe, width, advance: ms => {
            time += ms
        }
    }
}

test('拖动连续旋转，松手吸附后才变更餐厅种类，支持反向滑动', () => {
    const {selected, drum, swipe} = create()
    drum.begin({type: 'touchstart', touches: [{clientX: 200, clientY: 200}]})
    drum.move({type: 'touchmove', touches: [{clientX: 100, clientY: 200}]})
    assert.equal(selected.value, 'sukiyaki')
    assert.ok(drum.position.value > 1 && drum.position.value < 2)
    drum.end({type: 'touchend', changedTouches: [{clientX: 100, clientY: 200}]})
    assert.equal(selected.value, 'barbecue')
    assert.equal(drum.position.value, 2)
    swipe(140)
    assert.equal(selected.value, 'sukiyaki')
})
test('循环滑动无首尾跳转，纵向滑动与轻微抖动不切换', () => {
    const {selected, drum, swipe} = create()
    swipe(3)
    swipe(10, 120)
    assert.equal(selected.value, 'sukiyaki')
    for (let i = 0; i < 5; i++) swipe(-140)
    assert.equal(selected.value, 'sukiyaki')
    assert.equal(drum.position.value, 6)
    assert.match(drum.rotation.value, /-432deg/)
})
test('点击相邻卡片沿最短路径转动，自定义和披萨可以直接相邻切换', () => {
    const {selected, drum} = create()
    drum.choose(0)
    assert.equal(selected.value, 'custom')
    drum.choose(4)
    assert.equal(selected.value, 'pizza')
    assert.equal(drum.position.value, -1)
})

test('窗口宽度在下一次拖动生效，拖动途中改变宽度不跳动', () => {
    const {drum, width} = create()
    drum.begin({clientX: 200})
    drum.move({clientX: 150})
    const first = drum.position.value
    width.value = 750
    drum.move({clientX: 150})
    assert.equal(drum.position.value, first)
    drum.end({type: 'touchcancel'})
    drum.begin({clientX: 200})
    drum.move({clientX: 150})
    assert.ok(Math.abs(drum.position.value - 1 - (first - 1) / 2) < 1e-9)
})

test('短距离快扫切换，缓慢拖动或停住后松手回到原卡片', () => {
    for (const [duration, pause, expected] of [[30, 0, 'barbecue'], [500, 0, 'sukiyaki'], [30, 150, 'sukiyaki']]) {
        const {drum, selected, advance} = create()
        drum.begin({clientX: 200})
        advance(duration)
        drum.move({clientX: 180})
        advance(pause)
        drum.end({type: 'mouseup', clientX: 180})
        assert.equal(selected.value, expected)
    }
})

test('纵向手势锁定方向，系统取消手势不切换卡片', () => {
    const {drum, selected} = create()
    drum.begin({clientX: 200, clientY: 200})
    drum.move({clientX: 195, clientY: 220})
    drum.move({clientX: 80, clientY: 225})
    drum.end()
    assert.equal(selected.value, 'sukiyaki')
    drum.begin({clientX: 200})
    drum.move({clientX: 50})
    drum.end({type: 'touchcancel'})
    assert.equal(selected.value, 'sukiyaki')
    assert.equal(drum.position.value, 1)
})

test('圆点在松手前预告吸附目标，反向拖回和取消会恢复，首尾循环正确', () => {
    const {drum, selected} = create()
    assert.equal(drum.highlightedIndex.value, 1)
    drum.begin({clientX: 200})
    drum.move({clientX: 150})
    assert.equal(selected.value, 'sukiyaki')
    assert.equal(drum.highlightedIndex.value, 2)
    drum.move({clientX: 195})
    assert.equal(drum.highlightedIndex.value, 1)
    drum.move({clientX: 150})
    drum.end({type: 'touchcancel'})
    assert.equal(drum.highlightedIndex.value, 1)
    drum.choose(0)
    drum.begin({clientX: 200})
    drum.move({clientX: 250})
    assert.equal(drum.highlightedIndex.value, 4)
    drum.end()
    assert.equal(selected.value, 'pizza')
    assert.equal(drum.highlightedIndex.value, 4)
})
