const test=require('node:test')
const assert=require('node:assert/strict')
const {loadModule,application}=require('../helpers/runtime.cjs')

test('UUIDv7含精确毫秒时间，同一毫秒生成的不同用户身份仍不同',()=>{
  const {createUserId,isUserId}=loadModule('utils/user-id')
  const timestamp=Date.parse('2026-10-24T08:09:10.123Z'),ids=new Set()
  for(let i=0;i<100;i++) {
    const id=createUserId(timestamp)
    assert.equal(isUserId(id),true)
    assert.equal(Number.parseInt(id.replace(/-/g,'').slice(0,12),16),timestamp)
    ids.add(id)
  }
  assert.equal(ids.size,100)
})

test('首次初始化保存UUID，刷新、改昵称和新建单人会话不会重建身份',()=>{
  const storage=new Map(),platform={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value)}
  const app=application(platform)
  assert.equal(app.bootstrap.initialize(),true)
  const id=storage.get('buffet-user-id-v1')
  assert.equal(loadModule('utils/user-id').isUserId(id),true)
  app.execute('BeginSession',{ticketPrice:100,diningMode:'单人'})
  new (app.load('ui/profile/UniProfileSettings').UniProfileSettings)({present:()=>{}}).save('新的昵称')
  const reopened=application(platform)
  assert.equal(reopened.bootstrap.initialize(),true)
  assert.equal(storage.get('buffet-user-id-v1'),id)
})

test('UUID持久化失败不返回临时身份，可重试并保持稳定',()=>{
  let fail=true
  const storage=new Map(),platform={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>{
    if(fail)throw Error('disk full')
    storage.set(key,value)
  }}
  const identity=new (loadModule('infrastructure/identity/UniUserIdentity',platform).UniUserIdentity)()
  assert.throws(()=>identity.load(),/用户身份保存失败/)
  assert.equal(storage.size,0)
  fail=false
  const id=identity.load()
  assert.equal(identity.load(),id)
})
