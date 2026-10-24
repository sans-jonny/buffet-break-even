const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const {parse, compileScript} = require('@vue/compiler-sfc')
const ts = require('typescript')
const vue = require('vue')
const {loadModule} = require('../helpers/runtime.cjs')

function button(disabled = false) {
  const filename = 'src/ui/components/depth-button/depth-button.vue'
  const {descriptor} = parse(fs.readFileSync(filename, 'utf8'), {filename})
  const source = compileScript(descriptor, {id:'depth-button'}).content
  const {outputText} = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}})
  const module = {exports:{}}
  vm.runInNewContext(outputText, {module, exports:module.exports,
    require:name=>name.startsWith('@/') ? loadModule(name.slice(2)) : require(name)})
  const emitted = [], scope = vue.effectScope()
  const state = scope.run(()=>module.exports.default.setup({disabled}, {expose:()=>{},emit:event=>emitted.push(event)}))
  return {state,emitted,scope}
}

test('凸起按钮初始静止，短按先压到底再打开弹窗，松手后还原', async () => {
  const {state,emitted,scope} = button()
  assert.equal(state.phase.value,'idle')
  assert.equal(emitted.length,0)
  state.press({type:'touchstart'})
  state.release({type:'touchend'})
  state.activate()
  assert.equal(state.phase.value,'pressing')
  assert.equal(emitted.length,0)
  state.animationEnd({detail:{animationName:'depth-press-in'}})
  for (let i=0;i<4;i++) {await vue.nextTick(); await Promise.resolve()}
  assert.equal(state.phase.value,'releasing')
  assert.deepEqual(emitted,['click'])
  state.animationEnd({detail:{animationName:'depth-press-out'}})
  assert.equal(state.phase.value,'idle')
  scope.stop()
})

test('禁用的凸起按钮不播放按压且不执行操作', () => {
  const {state,emitted,scope} = button(true)
  state.press({type:'touchstart'})
  state.activate()
  assert.equal(state.phase.value,'idle')
  assert.equal(emitted.length,0)
  scope.stop()
})
