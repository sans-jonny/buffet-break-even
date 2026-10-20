# 领域模型与规则

模型按业务名称直接放在各模块的 model 中，恢复与投影结构放在 model/snapshot。实体、值对象和集合的区别体现在身份及职责，不作为额外目录层级。

| 模型 | 职责 |
| --- | --- |
| Catalog.Product、ProductCatalog | 菜品身份，以及分类和等级筛选；筛选结果复制返回 |
| Session.DiningSession | 当前用餐聚合根，保护开始、覆盖、选菜、提交和关闭规则 |
| DiningSelection | 待选数量，加减、减至零移除、解析有效菜品 |
| DiningRound | 轮次快照与金额，恢复时保留已保存的轮次价值 |
| DiningResult | 合并已提交和待选价值，按菜品名称归并明细 |
| History.DiningRecord、DiningHistory | 记录身份、按 ID 保存更新、删除及累计统计 |
| Collection.CollectedReceipt | 收藏数据结构；读取、保存、删除分别由 CollectionReader、CollectionSaver、CollectionDeleter 负责 |

## 业务行为

```ts
const session = DiningSession.empty()
    .begin(200, '单人', 'meal-1')
    .changeSelection('beef', 1, catalog)
    .commitRound(catalog, '12:30:00')

const preview = session.preview(catalog, '2026-10-20 12:31')
const result = session.prepareCompletion(catalog, '12:31:00', '2026-10-20 12:31')
```

活动用餐只有在明确确认覆盖后才能重新开始。门票价格必须为有限正数，模式支持单人或多人。未开始时不能选菜，未知菜品不能加入，空轮次不会产生新记录。准备完成只计算结果，不提前修改待选或关闭会话；关闭时校验当前会话 ID。

金额按整数分汇总。总价值包括已提交轮次和有效待选；历史明细按名称合并数量并保留首次单价。回本比例允许超过 100%，60% 为接近回本。累计统计使用历史记录，收藏删除不改变统计。

## 身份、不可变性与状态

DiningSession 是当前用餐的聚合根。DiningResult.id 引用来源用餐，不代表结果拥有独立实体身份；轮次时间也不作为独立身份。ProductCatalog 为无独立业务标识的集合。DiningHistory 是本地用餐历史的聚合根，由仓储定位本地历史记录切片，统一管理按 ID 保存、删除及累计统计；不额外生成历史集合 ID。save、remove 修改当前聚合，不重建聚合或深复制未变更记录，统计在一次遍历中按分累计。

DiningRecord 及其嵌套明细采用 readonly 类型，不进行运行时冻结。DiningHistory 直接持有构造参数数组，save 直接保存记录引用，remove 使用 splice 原位删除；records 返回同一个只读集合引用，整个聚合内没有防御性复制。读出的集合是实时引用，不是独立快照，后续聚合变更会反映到已有引用中。只读约束由 TypeScript 在编译期提供；调用方通过原始可变对象、JavaScript 或类型断言仍可修改共享数据，聚合不隔离这类修改。

Collection 采用简单 CRUD 用例，不建立 ReceiptCollection 集合模型。CollectionReader 提供 findAll，CollectionSaver 提供 save，CollectionDeleter 提供 delete，LocalCollectionRepository 实现三个端口：同 ID 原位更新、新收藏置顶、删除不存在的 ID 时忽略。仓储实现仅访问 receipts 切片，数据库负责缓存与读写引用隔离；Interactor 保存或删除后查询并交给 CollectionOutput，Presenter 转换为 CollectionView.ViewModel，仍通过 AfterCommit 在事务成功后发布。历史记录和收藏保持独立保留、独立删除。

Session 的变更返回新对象；History 的变更在当前聚合实例内执行。仓储每次加载独立的 DiningHistory，未保存的变更不会修改数据库；保存失败或事务回滚后，后续加载仍返回已提交数据。Session 快照与 Catalog 集合读出复制嵌套数据，History 则共享 readonly 记录，由调用方遵守编译期只读约束。数据库写入支持只读数据，并在持久化边界克隆为独立的存储数据；Presenter 接受只读记录，生成独立的 ViewModel。模型不访问时间、ID、存储、Vue 或 Pinia，所需外部信息由参数提供。Catalog 的 Product 与 Session 的菜品快照分别归各自所有，不共享领域类型。

本轮评估后保留现有会话 API 和活动状态校验，没有为状态数量很少的会话新增状态类体系，也没有把简单校验全部拆成 Policy。后续只有状态分支或可组合业务规则实际增加时再引入这些抽象。

## 应用契约

每个模块使用 application/port/in、application/port/out、application/interactor。Request 和 Response 是 Input 命名空间内可构造的内部类，Token 为 Symbol。

输入 DTO 不泄露领域对象；输出端口只在本模块内使用领域类型。Interactor 读取端口、调用领域行为、保存并输出，Completion 仅通过兄弟模块公开 Input 协调。
