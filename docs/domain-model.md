# 领域对象与现有用户故事

以下用户故事从当前已实现功能提炼；本次调整保留业务行为、公共 Input 契约和持久化格式。

## 行为归属

| 原顶层函数模块 | 新领域对象 | 承担的行为 |
| --- | --- | --- |
| catalog/product-filter.ts | ProductCatalog | 持有目录快照，按分类/等级筛选并返回独立结果 |
| dining/session.ts | DiningSession | 开始或确认覆盖、校验活动状态、选菜、提交轮次、预览、准备结束、校验关闭 |
| dining/selection.ts | DiningSelection | 持有待选数量，加减、减至零移除、解析有效菜品明细 |
| dining/rounds.ts | DiningRound | 生成轮次快照、计算轮次价值、恢复历史轮次而保留已保存金额 |
| dining/result.ts | DiningResult | 合并已提交和待选价值，按名称归并明细，生成独立结果快照 |
| dining-history/records.ts | DiningHistory | 按 ID 保存或更新记录、删除记录、计算累计统计 |
| receipt-collection/collection.ts | ReceiptCollection | 按 ID 收藏或更新快照、删除收藏，保留独立生命周期 |

## 分类与目录

领域对象是总称，包含实体、值对象等概念。聚合根直接放在 domain 根目录，其余类型按以下子目录区分：

| 子目录 | 判断依据 | 当前类型 |
| --- | --- | --- |
| domain 根目录 | 聚合根，作为聚合的业务入口 | DiningSession |
| entity | 其他具有稳定业务标识的实体，同一 ID 的状态可以变化 | Catalog.Product、DiningRecord、CollectedReceipt |
| value-object | 没有独立身份，以内容描述业务含义；变化时返回新值 | DiningSelection、DiningRound、DiningResult |
| collection | 管理实体或快照集合，提供集合级行为，自身没有业务标识 | ProductCatalog、DiningHistory、ReceiptCollection |
| snapshot | 用于恢复、复制或投影的纯数据结构，不承担独立生命周期 | DiningSessionSnapshot、DiningResultSnapshot、ProductLine、SavedLine、SavedRound，以及 Dining 的 Product 副本 |

DiningSession 是实体，也是当前用餐的聚合根，直接放在 domain/DiningSession.ts；不再为它保留单独的 entity 上层目录。之前将 DiningHistory 和 ReceiptCollection 直接称为聚合根不够准确；当前它们没有独立标识，按领域集合归类。DiningRecord 与 CollectedReceipt 目前以 interface 定义实体的数据契约，分别通过记录 ID 和收藏 ID 定位、更新和删除。

DiningResult.id 引用来源用餐的 ID，不代表结果自身具有独立实体身份。同一会话可以生成不同内容的预览结果；结果按完整内容理解。DiningRound.time 只是值的一部分，不作为唯一标识。DiningSelection 中的 productId 同样只是对菜品实体的引用。

Catalog 的 Product 以菜品 ID 表示实体身份；Dining 中的 Product 是外部菜品信息的本地快照，因此分别放在 entity 和 snapshot 下。这两个类型不跨 Context 共享。

例如 Dining 的目录为：

~~~text
domain/
  DiningSession.ts
  value-object/DiningSelection.ts
  value-object/DiningRound.ts
  value-object/DiningResult.ts
  snapshot/DiningSessionSnapshot.ts
  snapshot/DiningResultSnapshot.ts
  snapshot/Product.ts
  snapshot/ProductLine.ts
  snapshot/SavedLine.ts
  snapshot/SavedRound.ts
~~~

实体契约和快照可以用 interface 表达，分类依据业务身份与职责，不依据 TypeScript 使用 class 还是 interface。集合写入通过领域行为完成，领域对象读出快照时复制嵌套数据。金额和回本计算继续作为 utils 中可复用的纯函数。

## 用户故事驱动的调用

用户开始用餐并提交一轮时，领域调用可以独立执行：

~~~ts
const session = DiningSession.empty()
    .begin(200, '单人', 'meal-1')
    .changeSelection('beef', 1, catalog)
    .commitRound(catalog, '12:30:00')

const preview = session.preview(catalog, '2026-10-19 12:31')
const completion = session.prepareCompletion(catalog, '12:31:00', '2026-10-19 12:31')
~~~

开始活动会话时不允许直接覆盖；仅 begin 的 replaceActive 参数为 true 时允许重新开始。未开始时不能选菜，未知菜品不能加入，空轮次不产生新记录。prepareCompletion 返回最终结果，但不修改原会话；close 需要匹配当前会话 ID。

记录和收藏拥有独立的生命周期：

~~~ts
const history = new DiningHistory().save(record)
const updated = history.save(correctedRecord)
const statistics = updated.statistics
const remaining = updated.remove(record.id)

const collection = new ReceiptCollection().collect(receipt)
const withoutReceipt = collection.remove(receipt.id)
~~~

## Application 与 Adapter

Interactor 获取 Repository 返回的领域对象，调用领域行为，将新对象保存成功后交给 Output。领域方法不读 Store、不访问存储、不生成系统时间或 ID；时间、ID 和菜品数据仍由显式 Port.Out 提供。

跨 Context 的 CompleteDiningInteractor 继续只调用公开 Input。它不会获得或操作其他 Context 的聚合根，且不接管各自的业务规则。事务暂存与一次提交仍由基础设施 Adapter 完成。

Repository 使用领域恢复方法或构造函数从自己的存储切片恢复对象，保存时明确映射为原有 DTO。Presenter 将领域查询结果转换成独立 ViewModel。

## 不可变性与失败恢复

领域变更返回新对象，旧聚合保持原值。selected、rounds、records、receipts 和结果明细的读出提供复制快照；不能通过普通数组/对象引用修改内部状态。DiningSessionSnapshot 和 DiningResultSnapshot 专门表示对象快照，不向公共 Port.In 泄露领域模型。

因此保存失败时可以保留原会话，事务失败时仍可丢弃所有暂存变更。现有单键提交、旧数据读取、失败重试和独立 Store 更新行为均保留。

## 验证

34 项测试覆盖直接领域行为、数量及金额边界、集合去重、输入/读出引用隔离、Interactor、Presenter、真实页面脚本及结束用餐事务回滚。另通过 TypeScript 类型检查与架构边界检查。
