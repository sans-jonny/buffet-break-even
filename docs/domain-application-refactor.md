# Domain / Application 重构落地说明

当前实现使用 schema 3 与 `buffet:v3:` 本地命名空间。schema 1/2 的旧日志和旧本地数据不迁移、不删除、不覆盖；验收创建新房间。

## 领域对象与事件

三个上下文按 `aggregate`、`entity`、`value-object`、`service`、`event`、`rejection` 分类。聚合、实体和值对象直接声明 `readonly` 业务字段，不再通过 `this.state` 或保存的 `snapshot` 字段访问数据。`reconstitute(snapshot)` 接收独立的重建数据；`snapshot()` / 值对象的 snapshot getter 只导出深复制的数据，不是对象内部的数据容器。所有 `Object.freeze(this)` 已移除；`readonly` 提供编译期约束，运行时不会阻止 JavaScript 强制改写实例。构造输入、持久化记录和返回 DTO 均与领域实例脱离。

业务方法不修改接收者，返回精确的成功事件或类型化拒绝。事件仅有 `aggregateId`、`expectedVersion` 与确定的业务事实，不保存聚合快照，也不知道 Storage 键、传输 schema 或事件流序号。

```ts
const started = Domain.accepted(DiningActivity.create('meal', Money.ofMinor(20000), 'SINGLE'))
const activity = await activities.apply(started)
const changed = await activities.apply(activity!.changeTicketPrice(Money.ofMinor(18000)))

const increased = consumption.increaseProduct(roundId, productId, 2)
// increased.facts = { roundId, productId, quantity: 2 }
const updated = await consumptions.apply(increased)
```

创建事件携带创建所需数据；调票价只携带新票价；增减数量只携带轮次、商品和数量；提交轮次只携带轮次 ID；目录清理携带已经确定的移除商品 ID；终结消费不携带整组轮次。完成用餐的事件携带当时确定的结果明细，目录发布事件携带本次发布的目录内容，它们是该业务事实本身所需的数据。

序列化位于 Adapter，schema 3 的 payload 为 `{aggregateId, expectedVersion, facts}`。回放只应用已确定事实，不执行历史业务命令、不生成 ID、不重新计算价格，也不产生候选事件。

## Repository 契约与应用用例

Repository 表达查找聚合及应用领域事件的能力，不暴露事务或存储实现：

```ts
interface RestaurantConsumptionRepository {
    findById(id: string): RestaurantConsumption | undefined
    all(): readonly RestaurantConsumption[]
    apply(event: RestaurantConsumption.Event | DomainRejection): Promise<RestaurantConsumption | undefined>
}
```

`stage` 已从 Repository 契约删除。只有基础设施工作区内部保留暂存机制。Query 端口也不再传递事务视图。存储键、事件编码、可变持久化表示、版本检查与投影全部位于 Adapter / Infrastructure。

每项应用能力有自己的 UseCase、Request/Response 和 Interactor。Request 校验输入形态，Domain 校验业务不变量，Repository 适配器把类型化拒绝转换为 `BusinessRuleError`。Response 不含聚合实例；DTO 使用深复制和冻结，保护 UI 缓存。实例本身不再冻结。

事务型 Interactor 继承 `TransactionalInteractor` 并实现自己的 UseCase，子类只实现 `executeInTransaction`，不覆写 `execute`。普通查询不启动写事务。协调层只调用注入的公开 UseCase 的 `execute()`，不读取私有领域对象或业务存储键。

## 容器与事务作用域

当前采用类型化的 `UniAppUseCaseScope` 轻量容器，使用 `provide` 注册实例、`factory` 注册按需创建的依赖；UI 根将已解析对象发布到 Vue `app.provide`，事务作用域不创建 Vue App，也不通过 Vue 上下文解析业务依赖。不存在 `InTransactionUseCase`、具体 TransactionPort、`*Transactions` 能力集合或公开的 `executeIn()` 方法。

外层 `TransactionalInteractor` 开启事务后创建独立依赖作用域。该作用域按需创建 Interactor、Repository 与 Query 适配器，同一作用域复用实例，跨作用域保持隔离，Repository 通过注入的 `RepositoryTransaction` 获取当前工作区。嵌套 UseCase 仍调用 `execute()`，使用 `ActiveTransactionRunner` 加入同一事务；同一用例内串行 `apply` 读己之写，最外层只提交一次。没有全局可变的异步事务指针。失效、伪造的事务作用域不可访问。

直接使用容器根作用域的 Repository 调用 `apply` 时，如果没有有效事务，适配器自动开启一次短事务并等待提交。多人已存在聚合按关联房间选择事件流；新建多人活动需要绑定房间的事务作用域，不会默默作为单人提交。裸调用多次 `apply` 不会自动推断一个跨调用事务：需要共用事务的 UseCase 必须继承事务基类。

容器的工厂类型检查、延迟实例化、作用域隔离、构造失败恢复和循环依赖检测均有测试；没有引入第三方容器。

## 单人与多人 apply

两种模式共用 Repository 的版本校验与确定性事实应用逻辑，由事务作用域选择本地或远程提交策略，避免复制领域规则。

1. 适配器根据事件的聚合根 ID 读取当前事务的持久化记录，检查记录版本与 `expectedVersion`。不一致抛出 `AggregateConflictError`；一致则根据事实修改独立的可变持久化表示，并递增聚合版本。
2. 通过新记录重建并返回新聚合。删除消费记录时返回 `undefined`。暂存后重新查询会读到新状态；其他作用域仍看到上一个完整提交。
3. 单人事务结束时，用 COW/Manifest 一起发布日志、投影和游标。多人准备阶段只修改隔离工作区并按顺序收集事件；事务结束前不发送服务端。
4. 多人批次由所有 Repository 共用房间事件流游标。每个传输事件包装连续的 `streamVersion`，与聚合自己的 `expectedVersion` 分开。服务器校验序号与批次预期版本，以 SQLite CAS 原子保存整个批次。
5. 发生 CAS 冲突时，HTTP 409 响应携带从客户端游标起缺失的完整批次及分页信息。客户端先应用这些批次，再补齐后续页；丢弃旧候选事件，重新执行原始命令，不能给旧事实重新编号后提交。
6. 无冲突则保存并广播完整已提交批次。客户端接收后进入本地串行事务，在隔离工作区先更新事件流游标，再按顺序交给 Repository 注册的事件应用器更新持久化记录，全部成功后统一发布。缺批次时通过 HTTP 补齐，重复批次忽略。

聚合版本冲突、事件应用失败或派生事件失败均不发布部分工作区；即使调用方捕获暂存错误，失败的事务也不能提交。Response 等完整提交及本地投影成功后返回。远程已成功、本地失败仍报告 `SYNC_PENDING`；响应丢失保留持久化 `UNKNOWN`，不自动重复加量。

提交轮次时，在同一用例中依次应用 `RoundSubmitted` 和 `RoundCreated`，不额外引入固定后置 Handler。身份、会话、小票与历史使用 `LocalDiningData`，不追加远程房间日志。UI 缓存刷新失败不得重发写命令。本地原件与远程副本各有提交点，不宣称跨两者 ACID。

## 验收与边界

架构测试检查同名顶级对象、依赖方向、Repository 无事务参数和 stage、Domain 无 state 包装和事件快照、无冻结实例、子类不能覆写 execute。场景保留既有业务断言，并覆盖独立 apply 自动事务、串行 apply 共享工作区、聚合版本冲突整批回滚、多人跨 Repository 事件流序号、409 补发、完整广播、游标与投影原子发布和恢复。

早期重构验收记录：108 项测试全部通过，类型检查、H5 和微信小程序构建成功。真实浏览器完成单人用餐到历史及多人创建、加入、加菜同步和提交轮次流程；日志核验为 schema 3、无快照 payload、连续事件流序号，无页面异常。临时浏览器、服务和验收数据库已关闭或清理。微信真机未验证。

领域在线判定、可信成员授权、旧日志迁移和真机断电耐久仍未解决；服务器不校验领域业务规则。房间基础设施生命周期已补充：按连接数判断空房，持久化十分钟回收计时，允许同一用户创建及加入多个房间。
