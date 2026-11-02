# 统一事件批次实现说明

本分支从 `codex/vue-ui-only`（`24917a6`）创建，依据 `ddd-event-batches.md` 实现。文档中的命令与接口代码作为设计依据，未作为可执行指令或原样生产代码使用。

## 领域语言与文件约束

每个手写运行时 `.ts` 文件只有一个与文件名相同的顶级对象。使用 TypeScript 的 `namespace` 表达静态对象，内部的事实、快照类型与工厂共享本对象的不变量；不为减少文件数将不同聚合放进同一个对象。函数与同名 namespace、端口类型与同名 token
是 TypeScript 的同一对象声明合并。声明文件与 Vite 的框架配置入口不属于运行时对象。

UniApp 的 `main.ts` 是命名例外：必须声明本地 `createApp` 工厂，H5 编译器会直接注入 `createApp().app…`。仅导出同名别名不能建立本地绑定，会使页面启动失败。该框架入口仍只有一个顶级函数，其余文件保持同名对象约束。

例如核算领域的行为：

```ts
const started = Domain.accepted(DiningActivity.create('meal', Money.ofMinor(20000), 'SINGLE'))
const activity = await activities.apply(started)
const change = await activities.apply(activity!.changeTicketPrice(Money.ofMinor(18000)))
const increased = RestaurantConsumption.reconstitute(consumption).increaseProduct(roundId, 'shrimp', 2)
const submitted = RestaurantConsumption.reconstitute(consumption).submitRound(roundId)
```

这些行为返回只读的最小事实或类型化拒绝，不改变接收者。Application 将拒绝转换为异常。`DiningActivity` 与 `RestaurantConsumption`
是独立聚合，`Round` 留在消费聚合内部。单人领域以 `SINGLE` 标识核算模式，不包含 Room/Host 概念。两个 BC 各自拥有 Money
值对象：核算使用 `Money.ofMinor(1500).times(2).minus(ticket)`，目录使用 `Money.pricedAt(1500)`；序列化保留最小单位字段，没有跨
BC 共享 Money 业务类型。

测试以 `DiningScenario.Meal` 复用业务语言与夹具：

```ts
const meal = await new DiningScenario.Meal().givenRestaurant()
await meal.givenSingle(20000)
await meal.whenEating(2)
await meal.whenSubmitting()
meal.thenQuantityIs(2).thenValueIs(3000)
```

`ArchitectureSpec` 检查同名顶级对象、Domain 依赖、公开跨 BC 端口、无协调 Domain、服务端无客户端领域依赖与导入循环。页面只操作
UI 草稿或调用应用服务；`DiningClient` 是 UI/UniApp 的装配适配器。

## 事务与恢复

`BatchRuntime` 在全应用单实例队列中准备工作区，`stage` 读己之写并 await 准备 Handler，最多 512 个事件 / 64
层派生。队列闭包完成后冻结批次。准备失败不追加服务端；回放阶段只投影事实与 await 本地投影 Handler，不重新运行准备 Handler。

单人直接分配本地连续版本，并将日志、投影、游标和可派生个人历史一起发布。多人先追加服务端 CAS 批次，再通过同一投影入口发布。公开查询只读取校验后的
manifest。COW 数据和 manifest 读回校验后切换唯一 `app:head`，提交后发 `DataInvalidationEvent`。垃圾回收保留当前及上一可信代引用的全部数据。

远程发送前先持久化技术状态 `outcome/<roomId>`，因此响应丢失或发送后进程崩溃在重启后仍禁止盲目重发。已知 409
拒绝先清除准备结果，再补齐并重新执行原始业务命令；最多 3 次尝试。未知结果只能补齐事实后由用户「核对提交」确认歧义，没有请求级去重。

完整批次校验包含流、前后版本、序号、数量、批次 ID。重复忽略，缺口补齐，半批拒绝；未知事件或未来 schema 阻塞整批。
`rebuild(roomId)` 在隔离状态中从零回放并一次发布，仅替换该房间投影；个人身份、原件、小票、历史及历史删除标记保留。

历史来自本地确定性投影；已完成事件中的资格决定是否保存，不新增权威事件。用户删除历史后不会因普通刷新或房间重建重新出现；显式「补存历史」可恢复。个人小票后存覆盖前存，快照固定消费明细、分轮与对应目录版本，不持久化整个菜单。

## 服务端与网络

单个 npm 模块。Prisma/SQLite 只存 `RoomStream`、`RoomBatch`、`RoomEvent`；服务端不导入客户端业务代码，不解释
payload，不校验房主、金额或终态。事件文档与批次文档保留完整传输信息，数据库另存必要的版本、关联与唯一索引。

HTTP 支持流创建、房间码定位、head、按完整批次分页及原子追加。WS 先发送 `subscribed`，随后广播 head 提示。客户端先订阅，再补齐；5
秒 HTTP 对账补偿广播丢失或 WS 断开。单批最多 512 条，JSON 最多 500000 字符，HTTP body 最多 2MB，每条流最多 100000
条；不进行日志中段裁剪。

## 已知边界与未决事项

以下沿用设计文档的风险，未宣称全部验收已完成：

- R-01/R-02：异常断网不是可信领域离线事实；主动退出有确定性房主交接，突然掉线的自动交接与真实在线结算资格仍待完善。服务器不依据业务 payload 执行终态封锁。
- R-05：已按服务端 WebSocket 连接数实现空房十分钟回收，计时持久化并在重连时取消；到期删除整个房间流与私有菜单。连接检查与回收串行执行，当前支持单服务进程。用户可创建和加入多个房间。
- R-03/R-04/R-16：纯中继信任客户端。知道定位信息者可读取/追加，不具备可靠成员授权或防恶意写入保证。`RelaySpec`
  显式验证正确信封中的非法业务 payload 仍被接受。
- R-06：初始公共目录是明确标注的内置参考数据；更新通过 `publishLocal`
  发布完整版本并传播到本机已知的在线房间。没有外部公共目录发布服务或全设备变更推送承诺。房间目录事实自身在日志中，因此存续期内的新成员可完整重放。
- R-07/R-12：私人原件本地发布与远端房间副本发布是两个提交点。失败时保留原件，创建者重新加入可按源版本重对账；所有客户端离线时不承诺立即传播。
- R-08/R-09：Mock 故障注入、H5 与微信小程序编译不等于真机强制断电测试。单 key 真实断电原子性、设备容量和全链回放性能需在
  Android/iOS/微信/App 真机专项验证。校验失败进入 `RECOVERY_REQUIRED`，不自动清空数据。`recoverPrevious`
  是显式、有潜在本地写入损失的恢复操作。
- R-10/R-11/R-15：当前事实 schema 为 2，未知版本阻塞，不提供未经验证的
  upcast。日志完整保留，未做长期压缩；房间外部删除之后不能重建。缺少实际容量基准前不承诺永久本地日志耐久。
- R-13：没有请求幂等键；「核对提交」是用户确认歧义，不是系统证明上次操作的身份。
- R-14：房间 CAS 是并发边界，冲突将整条命令重新决策，达到重试上限返回冲突。

当前客户端并不迁移旧业务版本的 Storage；使用全新 `app:*` 提交格式，不删除未知旧 key。旧 SQLite 业务数据不应据此宣称已迁移。

Domain/Application 最新接口和存储命名空间以 [重构落地说明](domain-application-refactor.md) 为准。
