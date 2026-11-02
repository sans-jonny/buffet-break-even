import {DomainScenario} from '../support/DomainScenario'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DiningScenario} from '../support/DiningScenario'
import {Transaction} from '../../src/kernel/application/Transaction'
import {IncreaseProductUseCase} from '../../src/contexts/accounting/application/port/in/IncreaseProductUseCase'
import {GetConsumptionUseCase} from '../../src/contexts/accounting/application/port/in/GetConsumptionUseCase'
import {GetDiningActivityUseCase} from '../../src/contexts/accounting/application/port/in/GetDiningActivityUseCase'
import {DiningActivity} from '../../src/contexts/accounting/domain/aggregate/DiningActivity'
import {RestaurantConsumption} from '../../src/contexts/accounting/domain/aggregate/RestaurantConsumption'
import {ProductQuantityIncreased} from '../../src/contexts/accounting/domain/event/ProductQuantityIncreased'
import {Domain} from '../../src/kernel/domain/Domain'
import {InvalidRequestError} from '../../src/kernel/application/InvalidRequestError'
import {createSSRApp,inject} from 'vue'
import {Buffet} from '../../src/composition/Buffet'
import {TransactionalInteractor} from '../../src/kernel/application/TransactionalInteractor'
import {IncreaseProductInteractor} from '../../src/contexts/accounting/application/use-case/IncreaseProductInteractor'

export namespace TransactionalInteractorSpec {
    export function verify():void {
        test('UniApp 原生容器将 UseCase 绑定到 Interactor；事务是可选的基类实现',()=>{
            const nativeApp=createSSRApp({}),storage=new DiningScenario.Storage();let sequence=0
            const application=Buffet.create({storage,id:()=>String(++sequence),now:()=>new Date().toISOString()},nativeApp)
            const increase=application.resolve(IncreaseProductUseCase.token)
            assert.equal(nativeApp.runWithContext(()=>inject<IncreaseProductUseCase>(IncreaseProductUseCase.token)),increase)
            assert.ok(increase instanceof IncreaseProductInteractor)
            assert.ok(increase instanceof TransactionalInteractor)
            assert.ok(!(application.resolve(GetConsumptionUseCase.token) instanceof TransactionalInteractor))
            assert.equal('executeIn' in increase,false)
        })
        test('一个协调写操作只开启一次顶层事务，固定后置事件不额外提交',async t=>{
            const meal=await new DiningScenario.Meal().givenRestaurant();await meal.givenSingle();await meal.whenEating()
            const runtime=meal.app.runtime,original=runtime.run.bind(runtime)
            const spy=t.mock.method(runtime,'run',original)
            await meal.whenSubmitting()
            assert.equal(spy.mock.callCount(),1)
            const batch=runtime.entries<{events:{type:string}[]}>('journal/').find(b=>b.events[0].type==='RoundSubmitted')!
            assert.deepEqual(batch.events.map(e=>e.type),['RoundSubmitted','RoundCreated'])
        })
        test('容器内嵌套 execute 共享事务，伪造和过期作用域不可调用',async()=>{
            const meal=await new DiningScenario.Meal().givenRestaurant();await meal.givenSingle();await meal.whenEating()
            const session=meal.dining.session()!,roundId=meal.dining.consumption('buffet')!.rounds[0].id
            let retained!:Transaction.Context,interactor!:IncreaseProductUseCase
            const request=new IncreaseProductUseCase.Request(session,session.activityId,'buffet',roundId,'shrimp',1)
            const response=await meal.app.runtime.run(session.scopeId,null,async tx=>{
                retained=tx
                const scope=meal.app.scope(tx)
                interactor=scope.resolve(IncreaseProductUseCase.token)
                const first=await interactor.execute(request)
                assert.equal(first.value.rounds[0].items.shrimp,2)
                assert.throws(()=>meal.app.scope({...tx}),/INVALID_TRANSACTION_CONTEXT/)
                const wrong=new IncreaseProductUseCase.Request({scopeId:'other',roomId:null},session.activityId,'buffet',roundId,'shrimp',1)
                await assert.rejects(interactor.execute(wrong),/INVALID_TRANSACTION_CONTEXT/)
                return interactor.execute(request)
            })
            assert.equal(response.value.rounds[0].items.shrimp,3);meal.thenQuantityIs(3)
            await assert.rejects(interactor.execute(request),/INVALID_TRANSACTION_CONTEXT/)
            await assert.rejects(retained.stage({type:'Ignored',schemaVersion:2,key:'invalid',payload:{}}),/BATCH_SEALED/)
        })
        test('查询不调用 TransactionRunner，返回冻结 DTO 而非聚合实例',async t=>{
            const meal=await new DiningScenario.Meal().givenRestaurant();await meal.givenSingle();await meal.whenEating()
            const runtime=meal.app.runtime,spy=t.mock.method(runtime,'run',runtime.run.bind(runtime)),head=meal.storage.get('app:head')
            const response=meal.app.resolve(GetDiningActivityUseCase.token).execute(new GetDiningActivityUseCase.Request(meal.dining.session()!.activityId))
            assert.equal(spy.mock.callCount(),0);assert.equal(meal.storage.get('app:head'),head)
            assert.ok(!(response.value instanceof DiningActivity));assert.ok(Object.isFrozen(response.value))
            assert.throws(()=>{(response.value as any).ticketPriceMinor=1},TypeError)
            assert.equal(meal.dining.activity()!.ticketPriceMinor,20000)
        })
        test('Request 在进入事务前拒绝错误形态，业务拒绝不提交任何候选事件',async()=>{
            const meal=await new DiningScenario.Meal().givenRestaurant();await meal.givenRoom();await meal.whenEating(1,'room:buffet','room:buffet:shrimp')
            const s=meal.dining.session()!,roundId=meal.dining.consumption('room:buffet')!.rounds[0].id
            assert.throws(()=>new IncreaseProductUseCase.Request(s,s.activityId,'room:buffet',roundId,'room:buffet:shrimp',-1),InvalidRequestError)
            const sent=meal.relay.sent
            await assert.rejects(meal.dining.edit('room:buffet','reduce','room:buffet:shrimp',2),/INSUFFICIENT_QUANTITY/)
            assert.equal(meal.relay.sent,sent)
        })
        test('Response 等待远程提交后的异步本地投影完成，期间不暴露半完成状态',async()=>{
            const meal=await new DiningScenario.Meal().givenRestaurant();await meal.givenRoom()
            let entered!:()=>void,release!:()=>void
            const enteredPromise=new Promise<void>(r=>{entered=r}),gate=new Promise<void>(r=>{release=r})
            meal.app.runtime.onCommitted('ProductQuantityIncreased',async()=>{entered();await gate})
            let returned=false
            const command=meal.whenEating(2,'room:buffet','room:buffet:shrimp').then(()=>{returned=true})
            await enteredPromise
            assert.equal(returned,false);assert.equal(meal.dining.consumption('room:buffet'),undefined)
            assert.ok(meal.relay.streams.get('room')!.some(b=>b.events.some(e=>e.type==='ProductQuantityIncreased')))
            release();await command;assert.equal(returned,true);meal.thenQuantityIs(2,'room:buffet','room:buffet:shrimp')
        })
        test('显式轮次参数不会绕过锁定，领域事件无存储键和传输版本',()=>{
            const created=DomainScenario.consumption(RestaurantConsumption.create('meal','restaurant','round-1'))
            const model=RestaurantConsumption.reconstitute(created),before=JSON.stringify(model.snapshot())
            const increased=Domain.accepted(model.increaseProduct('round-1','shrimp',2))
            assert.ok(increased instanceof ProductQuantityIncreased);assert.equal(JSON.stringify(model.snapshot()),before)
            assert.deepEqual(increased.facts,{roundId:'round-1',productId:'shrimp',quantity:2})
            assert.equal('key' in increased,false);assert.equal('schemaVersion' in increased,false)
            const locked=DomainScenario.consumption(Domain.accepted(RestaurantConsumption.reconstitute(DomainScenario.consumption(increased, created)).submitRound('round-1')), DomainScenario.consumption(increased, created))
            const next=DomainScenario.consumption(Domain.accepted(RestaurantConsumption.reconstitute(locked).createNextRound('round-2')), locked)
            assert.equal((RestaurantConsumption.reconstitute(next).increaseProduct('round-1','shrimp',1) as {rejected:string}).rejected,'ROUND_LOCKED')
        })
        test('容器注入的只读用例读取同一准备状态，过期后拒绝访问',async()=>{
            const meal=await new DiningScenario.Meal().givenRestaurant();await meal.givenSingle();await meal.whenEating()
            const session=meal.dining.session()!;let query!:GetConsumptionUseCase
            await meal.app.runtime.run(session.scopeId,null,async tx=>{
                const scope=meal.app.scope(tx)
                query=scope.resolve(GetConsumptionUseCase.token)
                const before=query.execute(new GetConsumptionUseCase.Request(session.activityId,'buffet')).value!
                await scope.resolve(IncreaseProductUseCase.token).execute(new IncreaseProductUseCase.Request(session,session.activityId,'buffet',before.rounds[0].id,'shrimp',2))
                const after=query.execute(new GetConsumptionUseCase.Request(session.activityId,'buffet')).value!
                assert.equal(after.rounds[0].items.shrimp,3)
            })
            assert.throws(()=>query.execute(new GetConsumptionUseCase.Request(session.activityId,'buffet')),/INVALID_TRANSACTION_CONTEXT/)
        })
        test('schema 1/2 不静默回放；版本化本地命名空间不覆盖旧开发数据',async()=>{
            const meal=new DiningScenario.Meal()
            meal.storage.values.set('app:head','legacy-head')
            meal.storage.values.set('buffet:v2:app:head','previous-head')
            await meal.givenRestaurant();await meal.givenSingle()
            assert.equal(meal.storage.values.get('app:head'),'legacy-head')
            assert.equal(meal.storage.values.get('buffet:v2:app:head'),'previous-head')
            assert.ok(meal.storage.values.get('buffet:v3:app:head'))
            const {EventBatch}=await import('../../protocol/EventBatch')
            for (const schemaVersion of [1, 2]) {
                const batch=EventBatch.commit({scopeId:'old',roomId:'old',expectedVersion:0,events:[{type:'DiningStarted',schemaVersion,key:'accounting/activity/old',payload:{}}]},'legacy')
                await assert.rejects(meal.app.runtime.projectCommitted(batch),/BLOCKED_UNKNOWN_EVENT/)
                assert.equal(meal.app.runtime.get('cursor/old'),undefined)
            }
        })
    }
}
