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
| Collection.CollectedReceipt、ReceiptCollection | 收藏身份、按 ID 收藏更新及独立删除 |

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

DiningSession 是当前用餐的聚合根。DiningResult.id 引用来源用餐，不代表结果拥有独立实体身份；轮次时间也不作为独立身份。History、Collection、ProductCatalog 为无独立业务标识的集合。

变更返回新对象，快照和集合读出复制嵌套数据，调用方不能通过引用改变领域对象。模型不访问时间、ID、存储、Vue 或 Pinia，所需外部信息由参数提供。Catalog 的 Product 与 Session 的菜品快照分别归各自所有，不共享领域类型。

本轮评估后保留现有会话 API 和活动状态校验，没有为状态数量很少的会话新增状态类体系，也没有把简单校验全部拆成 Policy。后续只有状态分支或可组合业务规则实际增加时再引入这些抽象。

## 应用契约

每个模块使用 application/port/in、application/port/out、application/interactor。Request 和 Response 是 Input 命名空间内可构造的内部类，Token 为 Symbol。

输入 DTO 不泄露领域对象；输出端口只在本模块内使用领域类型。Interactor 读取端口、调用领域行为、保存并输出，Completion 仅通过兄弟模块公开 Input 协调。
