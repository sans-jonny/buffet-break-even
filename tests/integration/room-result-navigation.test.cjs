const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const vue=require('vue')
const flush=async()=>{for(let i=0;i<6;i++){await vue.nextTick();await Promise.resolve()}}

function setup(route) {
  const room=vue.shallowReactive({view:{snapshot:null}}),application=vue.reactive({ready:true})
  let page={route}, fail=false,depth=1
  const calls=[],errors=[]
  const navigation={toResult:async(...args)=>{
    calls.push(args)
    if(fail) throw Error('navigation failed')
    page={route:'pages/result/index'}
  }}
  const module={exports:{}}
  const {outputText}=ts.transpileModule(fs.readFileSync('src/ui/composables/useRoomResultNavigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}})
  vm.runInNewContext(outputText,{module,exports:module.exports,getCurrentPages:()=>page?Array.from({length:depth},()=>page):[],require:name=>({
    vue,
    '@/ui/stores/useRoomStore':{useRoomStore:()=>room},
    '@/ui/stores/useApplicationStore':{useApplicationStore:()=>application},
    '@/ui/navigation/BuffetNavigation':{BuffetNavigation:Symbol()},
    './useRequired':{useRequired:()=>navigation},
    './runAction':{runAction:async action=>{try{await action()}catch(error){errors.push(error)}}}
  })[name]})
  const scope=vue.effectScope(),check=scope.run(()=>module.exports.useRoomResultNavigation())
  const present=(status='ended')=>{room.view={snapshot:{id:'room-1',status,receipt:status==='ended'?{id:'room-1'}:null}}}
  return {calls,errors,check,present,scope,application,clearRoom:()=>{room.view={snapshot:null}},setPage:value=>page=value,setFailure:value=>fail=value,setDepth:value=>depth=value}
}

test('两位成员处于不同页面，结束广播均进入最终结果并清除旧页面栈，重复广播不重复导航',async()=>{
  const host=setup('pages/menu/index'),guest=setup('pages/mine/index')
  host.present('active');guest.present('active')
  await flush()
  assert.equal(host.calls.length,0)
  host.present();guest.present()
  await flush()
  assert.deepEqual(host.calls,[[undefined,'reset']])
  assert.deepEqual(guest.calls,[[undefined,'reset']])
  host.present();guest.present()
  await host.check();await guest.check();await flush()
  assert.equal(host.calls.length,1);assert.equal(guest.calls.length,1)
  host.scope.stop();guest.scope.stop()
})

test('已在当前结果页时不跳转，收藏详情在结束广播后切换到最终结果',async()=>{
  const current=setup('pages/result/index')
  current.present();await flush()
  assert.equal(current.calls.length,0)
  current.scope.stop()
  const saved=setup('pages/result/index')
  saved.setPage({route:'pages/result/index',options:{receiptId:'saved-receipt'}})
  saved.present();await flush()
  assert.equal(saved.calls.length,1)
  saved.scope.stop()
  const stacked=setup('pages/result/index')
  stacked.setDepth(3)
  stacked.present();await flush()
  assert.deepEqual(stacked.calls,[[undefined,'reset']])
  stacked.scope.stop()
})

test('重连后取得结束结果，等待应用与页面就绪；导航失败允许再次检查重试',async()=>{
  const app=setup('pages/records/index')
  app.application.ready=false
  app.present();await flush()
  assert.equal(app.calls.length,0)
  app.setPage(null);app.application.ready=true;await flush()
  assert.equal(app.calls.length,0)
  app.setPage({route:'pages/records/index'});app.setFailure(true)
  await app.check()
  assert.equal(app.errors.length,1)
  app.setFailure(false);await app.check()
  assert.equal(app.calls.length,2)
  app.scope.stop()
})

test('退出已结束房间后再次明确恢复，仍能从 setup 进入最终结果',async()=>{
  const app=setup('pages/menu/index')
  app.present();await flush()
  assert.equal(app.calls.length,1)
  app.clearRoom();app.setPage({route:'pages/setup/index'});await flush()
  app.present();await flush()
  assert.deepEqual(app.calls,[[undefined,'reset'],[undefined,'reset']])
  app.scope.stop()
})
