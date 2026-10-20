# Buffet 拆分记录

依据用户确认的领域划分，将原 Buffet 拆为 Dining、DiningHistory 和 ReceiptCollection，并建立 CompleteDining 协调 Context。已有 Catalog 保留。没有新增购物车、轮次、统计等独立 Context。

## 迁移结果

| 旧位置 / 职责 | 新位置 / 职责 |
| --- | --- |
| buffet/domain 会话、待选、轮次、结果 | dining/domain：DiningSession、DiningResult 及其规则 |
| buffet/domain Receipt 用于历史 | dining-history/domain：DiningRecord、快照更新及统计 |
| buffet/domain Receipt 用于收藏 | receipt-collection/domain：CollectedReceipt、收藏快照更新 |
| buffet/CompleteDiningInteractor | orchestration/complete-dining：只通过公开 Input 协调 |
| BuffetReader / Writer / Output | 三个 Context 各自的切片读写及输出端口 |
| BuffetPresenter / BuffetViewModel / useBuffetViewStore | Dining、History、Collection 各自 Presenter、ViewModel、Store |
| BuffetSnapshot 与 UniBuffetGateway | infrastructure/persistence 的 SnapshotDocument、UniSnapshotStorage 和 LocalDiningDatabase |
| 全局初始化一个 Buffet | 初始化各独立 Context，并连接 CompleteDining 所需公开 Input |

所有 Input 继续直接位于 port/in，Request / Response 为内部类，Token 为 Symbol。Independent Interactor 继续只注入实际用到的 Port.Out，跨 Context DTO 在各边界显式映射。

## 持久化与失败语义

领域边界与物理存储独立。现有 buffet-state-v3 文档保持格式和键不变，各 Repository 只读写自己拥有的 session、records 或 receipts 切片。完整文档仅属于基础设施，独立 Application 不再接触所有业务数据。

结束用餐在一个事务中暂存保存记录、可选收藏和关闭会话，一次存储成功后发布各自的展示投影。任意步骤或最终持久化失败都丢弃暂存状态和通知；缓存、存储与 Store 保持原值。重复结束和空用餐不写入。旧存储键读取与缺失记录初始化行为保留。

## 自动验证

34 项测试覆盖原有业务、独立领域查询与修改、真实页面脚本、注入注册、重启恢复以及新增的跨领域失败路径。新增的关键验证包括：

- 准备结束不提交待选，不提前关闭会话，返回 DTO 与领域对象隔离。
- 保存记录、收藏、关闭任一步骤抛错时，全部切片与通知回滚。
- 最终存储失败时，三个实际 Pinia Store 对象均不变化。
- 成功结束仅写一次存储，Presenter 通知发生在存储成功之后。
- 可选收藏、重复结束、保存重试保持原有行为。
- 删除记录或收藏只更新自己的 Store，不重建当前用餐和其他列表。
- 协调层和其组合根仅通过其他 Context 的 public.ts 引用 Input，不设置 Domain。

验证命令及完整业务说明见 [核心逻辑](./core-logic.md)。

## 领域对象行为归属

继续将数据接口配套的顶层函数收进领域对象，删除 product-filter.ts、session.ts、selection.ts、rounds.ts、result.ts、records.ts 和 collection.ts。新增 ProductCatalog、DiningSelection、DiningRound、DiningHistory、ReceiptCollection；DiningSession 和 DiningResult 从接口改为拥有行为的领域类。快照接口与领域对象分开，持久化格式不变。

活动会话覆盖校验、菜品变更校验、轮次提交与清空、准备结束、关闭校验、记录/收藏增删及历史统计由领域对象负责。Application 保留 I/O 顺序与 DTO 映射。跨 Context 结束用餐仍由协调层负责。

新增直接领域规则测试和收藏集合隔离测试，领域对象无需 Vue、Pinia、Repository 或 Interactor 即可测试。详见 [领域对象与用户故事](./domain-model.md)。

## Domain 内部分类

各 Context 的 domain 已按 entity、value-object、collection、snapshot 区分。分类依据业务身份与生命周期，类与接口都可以表达领域契约。DiningSession 是实体聚合根，直接放在 domain 根目录；DiningSelection、DiningRound、DiningResult 是值对象；目录、记录和收藏容器按领域集合归类。所有导入和测试路径同步迁移，业务行为及持久化格式不变。

## 运行验收

本轮验证 H5 / 微信小程序打包及页面脚本集成；没有进行真实浏览器或微信开发者工具点击验收。建议人工检查：开始用餐 → 菜品筛选及加减 → 提交轮次 → 结果预览 → 结束并收藏 → 记录与小票详情 → 分别删除 → 重启恢复，以及直接进入页面和返回降级。
