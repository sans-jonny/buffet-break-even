const test = require('node:test')
const assert = require('node:assert/strict')
const {reactive, nextTick} = require('vue')
const {pageHarness} = require('../helpers/pages.cjs')

test('轮播组件将选择和拖动预告传给页面，支持页面更新选中值', async t => {
    const props = reactive({
        modelValue: 'sukiyaki', items: [
            {id: 'creator', name: '创造者模式', emoji: '✏️'},
            {id: 'sukiyaki', name: '寿喜烧', emoji: '🍲'},
            {id: 'barbecue', name: '烤肉', emoji: '🥩'}
        ]
    })
    const events = []
    const {state, dispose} = pageHarness().component('cuisine-drum', props, (event, value) => {
        events.push([event, value])
        if (event === 'update:modelValue') props.modelValue = value
    })
    t.after(dispose)
    assert.deepEqual(events[0], ['preview', 'sukiyaki'])
    state.drum.choose(0)
    await nextTick()
    assert.equal(props.modelValue, 'creator')
    assert.deepEqual(events.at(-1), ['preview', 'creator'])
    props.modelValue = 'barbecue'
    await nextTick()
    assert.equal(state.drum.highlightedIndex.value, 2)
    assert.deepEqual(events.at(-1), ['preview', 'barbecue'])
    state.drum.begin({type: 'touchstart', touches: [{clientX: 200, clientY: 100}]})
    state.drum.move({type: 'touchmove', touches: [{clientX: 140, clientY: 100}]})
    await nextTick()
    assert.equal(props.modelValue, 'barbecue')
    assert.deepEqual(events.at(-1), ['preview', 'creator'])
    state.drum.end({type: 'touchend'})
    await nextTick()
    assert.equal(props.modelValue, 'creator')
})

test('餐厅分类新增、重排和删除后，轮播可选择最新列表中的所有卡片', async t => {
    const props = reactive({modelValue: 'sukiyaki', items: [
        {id: 'creator', name: '创造者模式', emoji: '✏️'},
        {id: 'sukiyaki', name: '寿喜烧', emoji: '🍲'}
    ]})
    const {state, dispose} = pageHarness().component('cuisine-drum', props, (event, value) => {
        if (event === 'update:modelValue') props.modelValue = value
    })
    t.after(dispose)
    props.items.push(
        {id: 'barbecue', name: '烤肉', emoji: '🥩'},
        {id: 'hotpot', name: '火锅', emoji: '🥘'},
        {id: 'pizza', name: '披萨', emoji: '🍕'}
    )
    await nextTick()
    for (let index = 0; index < props.items.length; index++) {
        state.drum.choose(index)
        await nextTick()
        assert.equal(props.modelValue, props.items[index].id)
        assert.equal(state.drum.highlightedIndex.value, index)
    }
    props.items.reverse()
    await nextTick()
    assert.equal(state.drum.highlightedIndex.value, 0)
    props.items = props.items.filter(item => item.id !== 'barbecue')
    await nextTick()
    state.drum.choose(3)
    assert.equal(props.modelValue, 'creator')
})

test('进度提示支持乱序阈值和相同阈值，进度条继续限制展示宽度', t => {
    const props = reactive({
        value: 248, target: 200, percent: 124, tips: [
            {progress: 100, text: '已回本', color: 'green'},
            {progress: 0, text: '刚开始', color: 'gray'},
            {progress: 100, text: '继续快乐', color: 'orange'},
            {progress: 50, text: '快到了', color: 'red'}
        ]
    })
    const {state, dispose} = pageHarness().component('progress-panel', props)
    t.after(dispose)
    assert.equal(state.activeTip.value.text, '继续快乐')
    assert.equal(state.fillPercent.value, 86.8)
    props.percent = 50
    assert.equal(state.activeTip.value.text, '快到了')
    props.percent = -1
    assert.equal(state.activeTip.value, undefined)
    assert.equal(state.fillPercent.value, 0)
    props.percent = 200
    assert.equal(state.fillPercent.value, 100)
})
