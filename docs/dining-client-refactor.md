# Page、Store 与 Bootstrap 职责

本文描述客户端装配和页面调用方式；餐厅分类、活动餐厅范围和私人对象上传见 [按餐厅分类创建用餐活动](restaurant-category-dining.md)。

Coordination 内部按初始化、设备状态、会话流程、用餐操作、房间协作、目录协调和个人记录分类，目录说明见 [Coordination 内容分类](../src/coordination/README.md)。共享 DTO 位于 `src/coordination/application/dto/Dining.ts`。

`DiningClient` 与 `useDining` 已删除。页面通过 `useDiningStore()`、`useCatalogStore()`、`useAccountingStore()`、`useCollaborationStore()`、`useSessionStore()` 和 `useMenuPageStateStore()` 获取同一应用根中的全局 Pinia Store，并直接读取响应式属性。页面不等待 `ready`，也不触发身份或默认目录初始化。

金额解析、小票展示、错误提示、表单临时 ID 与餐厅选择回退属于页面展示逻辑，复用函数位于 `src/ui/presentation`。餐厅选择保存到 `MenuPageStateStore.selectedRestaurants[activityId]`，菜单、轮次和结果页面共享选择；应用层的 `DiningPreferences` 只保留上次房间等会话恢复信息。

## 应用流程

会话操作沿 `Page → SessionStore → 具体 Port.In → Interactor` 调用。`DiningSessionWorkflow`、`DiningSessionService` 及聚合接口 `DiningSessions`、`DiningSessionActions` 已删除；应用编排直接由独立 Interactor 完成。Interactor 注入命令和查询 Port.In，并通过 `RoomGateway` 分配或查找房间、`RoomConnection` 管理同步生命周期、`DiningPreferences` 保存上次房间，不依赖 Store 或 QueryClient。

| 输入端口 / Interactor | 职责 |
| --- | --- |
| `InitializeDining` | 初始化身份，必要时填充默认目录；由 Bootstrap 调用 |
| `StartSingleDining` | 创建或替换单人用餐、选择会话，成功后停止房间连接 |
| `ResumeSingleDining` | 恢复指定会话，成功后停止房间连接 |
| `CreateDiningRoom` | 校验分类、分配远端房间、记录恢复入口、同步、创建多人用餐和选择会话 |
| `JoinDiningRoom` | 定位或恢复上次房间、补齐数据、加入或恢复会话 |
| `RefreshDiningSession` | 恢复当前房间的监听和同步 |
| `LeaveDiningSession` | 提交退出、清除当前会话，成功后停止连接 |
| `AcknowledgeDiningSubmission` | 核对当前房间的未知提交结果 |

上述名称分别对应 `*UseCase.ts` 与 `*Interactor.ts`。`SessionStore` 直接注入七个交互用例，构造 Request 并返回 Response；初始化端口不暴露为 Store 操作。`DiningStore` 专注业务视图和用餐命令，不再保留会话协调入口。

- 创建：用应用请求校验拒绝非法票价，再分配远端房间、记录上次房间、启动同步、调用多人创建用例及选取 Session。领域仍独立校验门票等不变量。
- 加入：解析房间号或读取上次房间，等待历史补齐，再通过应用查询判断是否恢复在线成员的 Session；其他情况调用加入用例，由领域判断房间状态及成员资格。
- 单人：setup 提示继续或放弃并新建；页面解析金额后调用 `SessionStore.startSingle` 或 `resumeSingle`，应用流程在操作成功后停止房间监听。创建和替换的业务事务由现有创建用例执行；失败时保留原连接。
- 初始化：先初始化身份，只有本地原件目录完全为空时才发布注入的参考目录。已删除的原件仍计入存在性判断，不会重置用户清理过的目录。

这些 Interactor 使用普通 `UseCase.Request`，跨远端分配、事件同步、业务提交和设备会话提交，按真实提交边界执行，不提供跨步骤的全局原子事务。内部的 `CreateSingleDining`、`CreateMultiplayerDining` 等已有 `TransactionalInteractor` 继续管理各自的事务。已分配的房间在后续失败时仍保留为上次房间；远端成功后会话选择失败可以重新加入恢复，不撤销或重发已提交的创建。退出提交结果未知时不清除当前会话、不停止恢复连接。

## 基础设施与装配

`ManagedRoomConnection` 管理订阅、首次历史同步、每五秒补齐和事件缺口恢复。重复监听同一房间会等待同一个初始化 Promise；首次同步失败会关闭订阅并允许重连；停止后延迟建立的旧连接会关闭，旧通知会被忽略。应用创建或加入明确失败时停止连接；`UNKNOWN_COMMIT_OUTCOME` 和 `SYNC_PENDING` 保留后台补齐，不自动重发写命令。

`StorageDiningPreferences` 封装上次房间的存储键。`ReferenceDiningCatalog` 保存默认目录配置。异步 `Bootstrap.device` 注册 `RoomGateway`、`RoomConnection`、`DiningPreferences`，调用 `CoordinationComposition.registerSessions` 装配独立会话 Interactor，再执行 `InitializeDiningUseCase`；等待身份和默认目录初始化后才完成，失败时释放连接、Store 与查询资源。原 `DiningDevice` 已删除。`Bootstrap.create` 为测试或无平台调用方提供核心装配，不负责启动 UI；`Buffet` 仅保留兼容导出。

UniApp 要求 `createApp()` 同步返回 `{app}`，因此 `Bootstrap.start` 将框架生成的 `app.mount(...)` 调用延迟到异步初始化成功后执行，保留原挂载参数并防止重复挂载。初始化失败时不挂载业务页面，入口负责呈现错误。页面 setup、页面生命周期和用户动作均发生在初始化完成之后。启动门控有自动化测试，微信端仍需在开发者工具和真机验证原生启动时序。

各 context 的 `composition/*Composition.ts` 注册本 context 的仓储、Query Port.Out、Interactor 和 Port.In，同时注册自己的事件投影。`coordination/composition/CoordinationComposition.ts` 装配跨 context 流程。组合根通过传入的容器获取 Bootstrap 注册的事务、个人数据和房间目录发布能力。事务作用域重新调用这些组合根，注入同一活动事务的 runner，保留嵌套调用读己之写与原子提交行为。

`UniAppUseCaseScope` 通过 `InjectionToken<T>` 推断注册与解析的服务类型，调用方无需重复传泛型。例如 `scope.resolve(GetConsumptionUseCase.token)` 自动返回 `GetConsumptionUseCase`；`scope.provide(GetConsumptionUseCase.token, interactor)` 按 token 的契约检查实现。`UseCase.Token<T>` 是同一类型的兼容别名，Port.Out 与基础设施 token 也携带自己的类型；事务作用域沿用这一约束。

## Page → Store → Port.In 与数据响应

- 全局 `CatalogStore`、`AccountingStore`、`CollaborationStore` 分别提供目录、活动/消费与房间视图；`DiningStore` 提供当前用餐的业务视图和命令；`SessionStore` 将会话操作直接委托给对应 Interactor 的输入端口。Store 之间不直接调用。
- 命令 Port.In 通过构造参数注入 Store；事务继续由已有 `TransactionalInteractor` / `TransactionRunner` 管理。命令响应保留，Store 不用响应写入查询缓存。
- `QueryClientProvider` 由 Bootstrap 注入查询 Port.In，集中注册 queryFn。包含身份、会话、小票和历史的设备查询也经过 `GetPersonalDiningUseCase`，Store 不直接查询 Port.Out。
- QueryClient 是每个应用根共享的唯一业务缓存，`staleTime: Infinity`、`retry: false`。查询读取已提交的本地投影，使用 `networkMode: always`，断网时仍可读取本地业务数据。现有 Query Port.In 同步返回 DTO，首次查询使用同步 initialData；后续刷新交给 Query Core。
- Repository 暂存的事件在持久化成功后，由现有 runtime 发布 `DataInvalidationEvent`。统一 `QueryInvalidationAdapter` 使依赖查询失效，QueryObserver 把结果投影到 Vue ref，页面自动响应。目前采用保守的全查询失效，涵盖跨 context 汇总；尚未按事件细分失效范围。
- `use…Store` 通过 `BusinessStoreScope` 绑定页面的查询订阅，同一页面获取多个 Store 只持有一次订阅租约。隐藏或卸载时释放，多个可见页面共享同一 QueryKey 的 observer；最后一个使用者释放后停止订阅，下一次显示只重建实际读取的视图。非活跃查询保留在 QueryClient，五分钟后可回收；无平台根由调用方执行 `dispose()` 释放。
- 消费查询明确使用活动 ID 与餐厅 ID，`accounting.consumption(activityId, restaurantId)` 可同时读取不同活动。`dining.sessionData` 仍代表设备当前选中的会话；需要固定展示其他活动的页面应持有自己的路由 ID，不能把当前会话当作页面私有状态。
- `MenuPageStateStore` 按活动/预览模式与餐厅 ID 分槽保存分类、购物车开关和票价编辑状态，不调用应用端口，不保存权威业务数据；暂不持久化。

回归测试位于 `tests/application/DiningSessionInteractorSpec.ts`、`tests/integration/query-stores.test.cjs`、`page-stores.test.cjs` 和 `bootstrap.test.cjs`，覆盖会话编排及跨提交步骤的恢复、Pinia 共享、响应式更新、多 ID 隔离、订阅恢复、事务和查询失败、页面状态隔离，以及初始化前不挂载、初始化失败不启动。

小票中的金额单位转换、轮次展示小计及“接近回本”的文案分级继续作为展示映射保留；领域中的消费核算和冻结结果保持原有实现。
