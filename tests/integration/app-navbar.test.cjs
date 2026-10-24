const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const {parse,compileScript} = require('@vue/compiler-sfc')
const vue = require('vue')

function navbar(count,props={}) {
  const filename='src/ui/components/app-navbar/app-navbar.vue'
  const {descriptor}=parse(fs.readFileSync(filename,'utf8'),{filename})
  const source=compileScript(descriptor,{id:'app-navbar'}).content
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}})
  const module={exports:{}},hooks={}
  vm.runInNewContext(outputText,{module,exports:module.exports,
    getCurrentPages:()=>Array.from({length:count}),
    uni:{getWindowInfo:()=>({statusBarHeight:24,windowWidth:375}),getMenuButtonBoundingClientRect:()=>({left:280})},
    require:name=>name==='vue' ? {...vue,onMounted:callback=>hooks.mounted=callback}
      : name==='@dcloudio/uni-app' ? {onShow:callback=>hooks.show=callback} : require(name)
  })
  const events=[]
  const state=module.exports.default.setup({fallback:false,...props}, {expose:()=>{},emit:event=>events.push(event)})
  return {state,hooks,events,setCount:value=>count=value}
}

test('通用导航在根页面隐藏返回键，页面栈变化后重新显示，保留状态栏与胶囊间距', () => {
  const {state,hooks,setCount}=navbar(1)
  assert.equal(state.canGoBack.value,false)
  assert.equal(state.navbarStyle.paddingTop,'24px')
  assert.equal(state.contentStyle.value.paddingRight,'103px')
  assert.equal(state.contentStyle.value['--navbar-center-guard'],'103px')
  setCount(2)
  hooks.mounted()
  assert.equal(state.canGoBack.value,true)
  assert.equal(state.contentStyle.value['--navbar-center-guard'],'max(103px, 120rpx)')
  setCount(1)
  hooks.show()
  assert.equal(state.canGoBack.value,false)
})

test('从上一级打开的页面显示返回键并保留页面自己的返回处理', () => {
  const {state,events}=navbar(3)
  assert.equal(state.canGoBack.value,true)
  state.handleBack()
  assert.deepEqual(events,['back'])
})

test('有明确返回目标的最终结果根页面可以显式显示返回键',()=>{
  const {state}=navbar(1,{showBack:true})
  assert.equal(state.canGoBack.value,true)
})

test('配置fallback后根页面显示返回键，无上一级触发fallback，有上一级保留back事件',()=>{
  const {state,events,setCount}=navbar(1,{fallback:true})
  assert.equal(state.canGoBack.value,true)
  state.handleBack()
  assert.deepEqual(events,['fallback'])
  setCount(2)
  state.handleBack()
  assert.deepEqual(events,['fallback','back'])
  setCount(1)
  state.handleBack()
  assert.deepEqual(events,['fallback','back','fallback'])
})
