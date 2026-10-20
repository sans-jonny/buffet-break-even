# 核心业务与 Context 架构

项目采用 uni-app Vue 3 + TypeScript + Pinia。领域和 Application 不依赖 Vue、Pinia、uni API 或基础设施；页面通过公共 Input 调用业务，读取 Context 外的全局 Store。

## 业务边界与数据所有权

| Context | 自己拥有的数据和规则 | 公开 Input |
| --- | --- | --- |
| independent/catalog | 菜品、分类、等级、目录筛选 | GetMenu |
| independent/dining | 当前会话、票价与模式、待选数量、轮次、用餐结果预览 | LoadDining、BeginSession、ChangeSelection、CommitRound、PrepareDiningCompletion、CloseDining |
| independent/dining-history | 完成后的记录快照、按 ID 更新/删除、累计差额与轮次/菜品统计 | LoadHistory、SaveRecord、DeleteRecord |
| independent/receipt-collection | 独立收藏快照、按 ID 更新/删除 | LoadCollection、CollectReceipt、DeleteReceipt |
| orchestration/complete-dining | 结束用餐的跨 Context 流程，无 Domain | CompleteDining |

DiningSession、DiningRecord、CollectedReceipt 分别属于自己的 Context。History 与 Collection 使用各自的领域类型，不导入 Dining 的 Domain。记录和收藏都保留完整快照：删除记录不会破坏收藏，删除收藏不影响历史统计。

待选与轮次仍属于 Dining，因为提交轮次必须同时清空待选。金额和回本算法位于 utils 中，作为无框架、无状态的纯函数供领域及展示映射复用；不为它们建立额外 Context。

## 契约与依赖

- 每个 Context 的 public.ts 只导出 Input。
- Input 文件直接放在 application/port/in 下，没有额外的用例子目录。
- Request 和需要的 Response 是 Input 命名空间内可构造的内部类，使用 Input.Request、Input.Response；Symbol 注入使用 Input.Token。
- Port.In 专属 DTO 通过显式映射创建，不返回领域实体。PrepareDiningCompletion 返回最终结果的独立 DTO，并不写入会话。
- 独立 Interactor 的构造参数仅使用实际用到的本 Context Port.Out，均不持有合并状态对象。
- Port.Out 使用自身 Domain 模型。各 Repository Adapter 映射自己的持久化切片；Presenter 映射独立 ViewModel。
- 协调 Application 只通过其他 Context 的 public.ts 引用 Input，事务抽象属于其自身 Port.Out。
- 本地组合根只创建自身具体实现；全局组合根连接公共 Input，并向各 Context 传入同一数据库实例。

## 富领域模型与用户故事

原有 7 个顶层函数模块已归入领域对象。Domain 中保留描述快照和明细的数据接口，业务行为由聚合根或值对象承接：

| 用户故事 | 领域对象及行为 |
| --- | --- |
| 开始用餐，确认后替换已有会话 | DiningSession.begin：活动状态、票价、模式、ID 校验 |
| 在活动用餐中加减菜品 | DiningSession.changeSelection：活动状态与菜品存在性；DiningSelection.change：数量变更与边界 |
| 提交本轮并清空待选 | DiningSession.commitRound、DiningRound.create |
| 查看当前价值和最终结果 | DiningSession.preview / prepareCompletion、DiningResult.from |
| 结束指定会话 | DiningSession.close：会话 ID 校验 |
| 保存、更新、删除记录，查看累计统计 | DiningHistory.save / remove / statistics |
| 收藏、更新和删除小票 | ReceiptCollection.collect / remove |
| 按分类和等级查看菜单 | ProductCatalog.filter |

领域变更返回新对象。集合和嵌套快照读出时复制，防止界面或持久化模型通过引用修改领域状态。Repository 从存储 DTO 恢复领域对象、保存时映射回快照；Interactor 只负责获取依赖、调用领域行为、保存和发布，不再自行判断活动会话、拼接轮次或筛除记录。

聚合根直接放在 domain 根目录，当前为 DiningSession；其他实体、值对象、领域集合和纯快照分别放在 entity、value-object、collection、snapshot 子目录。History、Collection 与 Catalog 当前属于无独立标识的领域集合。完整分类、映射及示例见 [领域对象与用户故事](./domain-model.md)。

## 分开的展示状态

| Store | 字段所有者与更新来源 |
| --- | --- |
| useDiningStore | DiningPresenter：session、待选、当前价值、回本进度、可结束状态、预览 |
| useHistoryStore | HistoryPresenter：records、累计差额、轮次和菜品统计 |
| useCollectionStore | CollectionPresenter：receipts |

Store 仅保存只读展示快照和简单赋值，没有业务用例或持久化访问。删除记录只更新 History Store，删除收藏只更新 Collection Store，不重新计算当前用餐。toReceiptView 只负责把快照转换成独立展示模型。

App 启动分别调用三个加载用例。menu / setup / order-slip 读取 Dining Store；records / record-detail 读取 History Store；receipts 读取 Collection Store；mine 读取 History 和 Collection；result 读取 Dining 和 Collection，并调用协调层 CompleteDining。

## 结束用餐与原子提交

CompleteDiningInteractor 在自身事务端口中调用：

1. PrepareDiningCompletion：在内存中合并最后的待选轮次，生成独立结果 DTO；无有效用餐时返回未完成。
2. SaveRecord：映射并暂存历史记录。
3. CollectReceipt：用户选择收藏时映射并暂存收藏快照。
4. CloseDining：校验会话 ID，暂存空会话。
5. 事务 Adapter 将暂存文档一次写入持久化，然后发布三个 Context 各自的展示投影。

LocalDiningDatabase 属于基础设施，负责单实例缓存、隔离读写引用、暂存切片、一次提交以及提交后通知。SnapshotDocument 是存储 DTO，不是跨 Context 的共享 Domain。

业务步骤或最终保存失败时，暂存文档与待发布通知全部丢弃，持久化、已提交缓存和各 Store 保持原值，可安全重试。空会话和重复结束不会写存储。独立修改仍为保存成功后立即发布自身投影。

当前所有业务 Port 都是本地同步调用；事务仅适用于本地同步流程，不代表具备远端数据库事务能力。

## 保留的业务规则与兼容性

- 票价必须为有限正数；模式仅支持单人/多人。替换活动会话需要页面确认。
- 加减数量校验活动会话和菜品 ID；数量降至零移除，未知菜品不参与结算。
- 金额按整数分汇总；本轮价值为单价乘数量，总价值包括已提交与待选轮次。
- 空轮次不能重复提交；每轮保存独立明细快照。
- 预览包含待选但不修改会话；结束用餐必定保存记录，可选收藏。
- 历史明细按名称合并数量并保留首次单价；轮次金额独立保存。
- 累计差额和数量以用餐记录为准；记录与收藏按 ID 独立删除。
- 回本百分比可超过 100%，60% 为接近回本；进度条缩放仍属于 UI。

持久化继续使用 buffet-state-v3 单键与 version: 3，内部结构仍为 session / records / receipts；不需要迁移现有 v3 数据。UniSnapshotStorage 继续读取 buffet-session-v2、buffet-records、buffet-receipts；旧 records 缺失时从已有收藏初始化。旧键保留，新文档存在后以新文档为准。

页面、所有组件、Stores、Navigation 均在 Context 外。保留自定义标签栏和 uni-app 原生导航，当前页面都位于主包。Input.Request / Response 内部类约定按用户后续要求覆盖原重构规范的分文件示例。

## 验证

- npm test：34 项，涵盖领域、独立用例、DTO 隔离、Presenter、真实组合根与页面脚本、旧存储兼容、各协调步骤失败、最终保存失败、单次提交和 Store 更新范围。
- npm run check:architecture：检查独立 Context 隔离、协调层公共入口、内层无框架依赖、Input 内部契约、单顶层类型声明和 UI/Store 边界。
- npm run type-check。
- npm run build:h5 -- --minify esbuild。
- npm run build:mp-weixin -- --minify esbuild。

构建与页面脚本集成测试不等于真实浏览器及微信开发者工具验收。本轮没有完成双端界面点击测试。详见 [重构记录](./refactoring.md)。
