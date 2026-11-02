# Page、Store 与 Bootstrap 职责

本文描述客户端装配和页面调用方式；餐厅分类、活动餐厅范围和私人对象上传见 [按餐厅分类创建用餐活动](restaurant-category-dining.md)。

Coordination 内部按初始化、设备状态、会话流程、用餐操作、房间协作、目录协调和个人记录分类，目录说明见 [Coordination 内容分类](../src/coordination/README.md)。共享 DTO 位于 `src/coordination/application/dto/Dining.ts`。

`DiningClient` 与 `useDining` 已删除。页面通过 `useDiningStore()`、`useCatalogStore()`、`useAccountingStore()`、`useCollaborationStore()`、`usePersonalStore()`、`useSessionStore()` 和 `useMenuPageStateStore()` 获取同一应用根中的全局 Pinia Store，并直接读取响应式属性。页面不等待 `ready`，也不触发身份或默认目录初始化。

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
| `RecoverDiningSelection` | 创建或加入已成功后，仅恢复本地会话选择 |
| `LeaveDiningSession` | 提交退出、清除当前会话，成功后停止连接 |
| `AcknowledgeDiningSubmission` | 核对当前房间的未知提交结果 |

上述名称分别对应 `*UseCase.ts` 与 `*Interactor.ts`。`SessionStore` 直接注入独立交互用例，构造 Request 并返回 Response；初始化端口不暴露为 Store 操作。`DiningStore` 专注业务视图和用餐命令，不再保留会话协调入口。

- 创建：用应用请求校验拒绝非法票价，再分配远端房间、记录上次房间、启动同步、调用多人创建用例及选取 Session。领域仍独立校验门票等不变量。
- 加入：解析房间号或读取上次房间，等待历史补齐，再通过应用查询判断是否恢复在线成员的 Session；其他情况调用加入用例，由领域判断房间状态及成员资格。
- 单人：setup 提示继续或放弃并新建；页面解析金额后调用 `SessionStore.startSingle` 或 `resumeSingle`，应用流程在操作成功后停止房间监听。创建和替换的业务事务由现有创建用例执行；失败时保留原连接。
- 初始化：先初始化身份，只有本地原件目录完全为空时才发布注入的参考目录。已删除的原件仍计入存在性判断，不会重置用户清理过的目录。

这些 Interactor 使用普通 `UseCase.Request`，跨远端分配、事件同步、业务提交和设备会话提交，按真实提交边界执行，不提供跨步骤的全局原子事务。内部的 `CreateSingleDining`、`CreateMultiplayerDining` 等已有 `TransactionalInteractor` 继续管理各自的事务。已分配的房间在后续失败时仍保留为上次房间；单人创建或多人创建、加入成功后，如果设备会话选择失败，抛出携带已提交 Session 的 `DiningSelectionPendingError`。`SessionStore.selectionPending` 保留恢复入口，setup 提示用户恢复，`RecoverDiningSelection` 校验活动和成员资格后只重试选择，不重新创建或加入。会话切换与恢复不允许并发；重启后仍可通过未完成单人活动或上次房间恢复。退出提交结果未知时不清除当前会话、不停止恢复连接；退出已提交但清理本地会话失败时，重试根据成员投影跳过重复退出，只完成清理。

## 基础设施与装配

`ManagedRoomConnection` 管理订阅、首次历史同步、每五秒补齐和事件缺口恢复。重复监听同一房间会等待同一个初始化 Promise；首次同步失败会关闭订阅并允许重连；停止后延迟建立的旧连接会关闭，旧通知会被忽略。应用创建或加入明确失败时停止连接；`UNKNOWN_COMMIT_OUTCOME` 和 `SYNC_PENDING` 保留后台补齐，不自动重发写命令。

`StorageDiningPreferences` 封装上次房间的存储键。`ReferenceDiningCatalog` 保存默认目录配置。异步 `Bootstrap.device` 注册 `RoomGateway`、`RoomConnection`、`DiningPreferences`，调用 `CoordinationComposition.registerSessions` 装配独立会话 Interactor，再执行 `InitializeDiningUseCase`；等待身份和默认目录初始化后才完成，失败时释放连接、Store 与查询资源。原 `DiningDevice` 已删除。`Bootstrap.create` 为测试或无平台调用方提供核心装配，不负责启动 UI；`Buffet` 仅保留兼容导出。

UniApp 要求 `createApp()` 同步返回 `{app}`，因此 `Bootstrap.start` 将框架生成的 `app.mount(...)` 调用延迟到异步初始化成功后执行，保留原挂载参数并防止重复挂载。初始化失败时不挂载业务页面，入口负责呈现错误。页面 setup、页面生命周期和用户动作均发生在初始化完成之后。启动门控有自动化测试，微信端仍需在开发者工具和真机验证原生启动时序。

各 context 的 `composition/*Composition.ts` 注册本 context 的仓储、Query Port.Out、Interactor 和 Port.In，同时注册自己的事件投影。`coordination/composition/CoordinationComposition.ts` 委托 `DiningComposition`、`CatalogCoordinationComposition`、`DeviceComposition`、`SessionComposition` 按职责注册跨 context 流程。组合根通过传入的容器获取 Bootstrap 注册的事务、个人数据和房间目录发布能力。事务作用域注册这些组合根的工厂，按需创建实际依赖，并注入同一活动事务的 runner，保留嵌套调用读己之写与原子提交行为。每个作用域独立缓存已解析实例，不共享事务实例；事务作用域不创建 Vue App。

`UniAppUseCaseScope` 通过 `InjectionToken<T>` 推断注册与解析的服务类型，调用方无需重复传泛型。例如 `scope.resolve(GetConsumptionUseCase.token)` 自动返回 `GetConsumptionUseCase`；`scope.provide(GetConsumptionUseCase.token, interactor)` 按 token 的契约检查实现。`scope.factory(token, () => implementation)` 同样检查返回契约并延迟创建；构造失败不缓存半成品，循环依赖明确报错。只有绑定 UI 的根容器会把显式提供或已解析的对象发布到 Vue；业务解析直接读取作用域容器。`UseCase.Token<T>` 是同一类型的兼容别名，Port.Out 与基础设施 token 也携带自己的类型。

## Page → Store → Port.In 与数据响应

- `DiningStore` 只提供当前用餐视图和核算命令，直接由 Pinia setup 实现，不再经过 adapter 类转发。当前身份和房间仍可作为用餐视图的一部分读取。
- `CatalogStore` 统一提供本地目录查询、发布和删除；默认查询排除删除项，恢复或诊断可显式调用 `restaurant(id, true)` 读取删除项。
- `CollaborationStore` 提供房间查询、转让房主和房间私人目录同步；`SessionStore` 将创建、加入、恢复和离开会话操作委托给对应 Interactor。
- `PersonalStore` 提供身份、昵称、小票和个人历史。`saveReceipt(result)` 接收明确的核算结果，`saveHistory(session, result)` 接收明确的会话和最终结果，不再通过当前会话隐式计算或选择记录。
- 每项写能力只有其所属 Store 的公开入口。页面和测试都已迁移，`DiningStore` 不保留旧写方法的兼容别名；Store 之间不直接调用。
- 命令 Port.In 通过构造参数注入 Store；事务继续由已有 `TransactionalInteractor` / `TransactionRunner` 管理。命令响应保留，Store 不用响应写入查询缓存。
- 所有业务命令 Store 共用 `stores/CommandState.ts` 管理并发命令计数、错误和查询订阅租约。每次命令独立获取租约，成功后等待查询刷新，最终释放；失败不自动重发写命令。Store 可按展示需要额外合并 QueryClient 的 fetching/error 状态。
- Store 通过 `QueryClientProvider.activities()`、`restaurants(scopeId)`、`rooms()`、`consumption(activityId, restaurantId)`、`personal()` 和 `result(session, actor, restaurantId)` 读取类型化查询。QueryKey 和返回类型集中在查询适配器中，原有缓存键保持兼容。
- `QueryClientProvider` 由 Bootstrap 注入查询 Port.In，集中注册 queryFn。包含身份、会话、小票和历史的设备查询也经过 `GetPersonalDiningUseCase`，Store 不直接查询 Port.Out。
- QueryClient 是每个应用根共享的唯一业务缓存，`staleTime: Infinity`、`retry: false`。查询读取已提交的本地投影，使用 `networkMode: always`，断网时仍可读取本地业务数据。现有 Query Port.In 同步返回 DTO，首次查询使用同步 initialData；后续刷新交给 Query Core。
- 没有页面 observer 时提交也会使缓存失效。重新创建 observer 前先同步读取失效查询的本地投影并更新缓存，避免首次读取已保存小票等数据时暂时返回旧值。
- Repository 暂存的事件在持久化成功后，由现有 runtime 发布 `DataInvalidationEvent`。统一 `QueryInvalidationAdapter` 使依赖查询失效，QueryObserver 把结果投影到 Vue ref，页面自动响应。runtime 在发布前对比业务投影，发布后通知实际变化的键，包含派生个人历史、删除项和房间目录基线。Adapter 将键映射到对应活动列表、具体消费、目录作用域、房间、个人数据和核算结果；只有空键通知或未知查询类型保留保守刷新。技术游标和提交状态变化不触发业务查询刷新。
- `use…Store` 通过 `BusinessStoreScope` 绑定页面的查询订阅，同一页面获取多个 Store 只持有一次订阅租约。隐藏或卸载时释放，多个可见页面共享同一 QueryKey 的 observer；最后一个使用者释放后停止订阅，下一次显示只重建实际读取的视图。页面 onShow 只恢复租约，不恢复房间连接，也不额外使全部查询失效。非活跃查询保留在 QueryClient，五分钟后可回收；无平台根由调用方执行 `dispose()` 释放。
- 消费查询明确使用活动 ID 与餐厅 ID，`accounting.consumption(activityId, restaurantId)` 可同时读取不同活动。`dining.sessionData` 仍代表设备当前选中的会话；需要固定展示其他活动的页面应持有自己的路由 ID，不能把当前会话当作页面私有状态。
- `MenuPageStateStore` 按活动/预览模式与餐厅 ID 分槽保存分类、购物车开关和票价编辑状态，不调用应用端口，不保存权威业务数据；暂不持久化。

回归测试位于 `tests/application/DiningSessionInteractorSpec.ts`、`tests/integration/query-stores.test.cjs`、`page-stores.test.cjs` 和 `bootstrap.test.cjs`，覆盖会话编排及跨提交步骤的恢复、Pinia 共享、响应式更新、多 ID 隔离、订阅恢复、事务和查询失败、页面状态隔离，以及初始化前不挂载、初始化失败不启动。

小票中的金额单位转换、轮次展示小计及“接近回本”的文案分级继续作为展示映射保留；领域中的消费核算和冻结结果保持原有实现。

## 用餐命令的共用准备逻辑

`coordination/application/service` 存放内部应用协作者，不是 UI 输入端口，也不直接访问仓储或基础设施：

- `DiningAccess` 通过 Collaboration 的公开查询和授权用例检查房间与活动对应关系，提供 `requireEditable`、`requireHost` 两个明确入口。单人会话不执行房间检查；多人返回通过检查的房间 DTO，结束用餐可直接使用其成员名单。
- `EditableDiningRound` 通过 Catalog、Accounting 的公开用例检查餐厅、读取或创建消费、取得活动轮次。加菜还校验商品存在。减菜、移除和清空继续保留此前缺少消费时尝试创建的行为，此次不修改业务语义。

两个协作者由 `CoordinationComposition` 在每个依赖作用域内构造，共用该作用域的查询和命令端口。权限检查、消费创建和核算修改均发生在调用 Interactor 的事务内；协作者不持有跨事务缓存，不开启独立提交。具体的加减菜、清空、轮次提交、调价和结束用例仍保留独立输入端口。

## 应用前后台与房间连接

`App.vue` 显式绑定 `onShow → DiningAppLifecycle.resume()`、`onHide → suspend()`。设备 Bootstrap 在初始化及业务页面挂载前注入生命周期对象；销毁或初始化失败时执行其 `dispose()`。生命周期不持有 Store，直接使用公开的 `RefreshDiningSessionUseCase` 和连接端口。

前台激活通过刷新用例读取当前已持久化会话，存在房间时启动监听及历史补齐；无房间时不访问网络。同一前台激活的重复通知共用恢复 Promise，页面切换不会再次启动恢复。进入后台暂停连接、停止订阅及轮询，后台延迟到达的连接请求也会被拒绝，不提交离开房间、不清除个人会话；再次前台激活恢复原会话连接。创建、加入、退出和单人切换仍由原会话用例管理其操作过程中的连接。

切后台会使当前激活失效。旧连接延迟完成或失败时，底层 `ManagedRoomConnection` 释放旧订阅，生命周期忽略其过期错误，不影响新的前台连接；当前恢复失败会报告一次并允许下次激活重试。销毁后不再执行恢复。测试覆盖真实 App 脚本的钩子绑定、并发通知、切后台期间的延迟订阅及失败恢复；原生前后台时序仍需真机验证。

## 目录保存与部分同步结果

发布或删除原件先完成本地业务事务，再由 `RoomCatalogSynchronization` 同步有资格更新的房间。响应的 `value` 为 `{localCommitted: true, pendingRooms: [{roomId, code}]}`：本地失败仍抛错，房间失败则返回部分完成结果，不否定已完成的本地保存，也不阻止其他房间尝试同步。

`GetPendingCatalogSync` 比较原件版本与房间副本的 sourceVersion，查询包括已删除原件。待同步项由持久化事实推导，不依赖内存任务队列，重启后仍可找回。`RetryCatalogSync` 只同步仍缺失的房间版本，不再次发布本地原件，也跳过已经同步的房间。`UNKNOWN_COMMIT_OUTCOME` 不自动重发，用户先回到房间核对；`SYNC_PENDING` 由权威日志补齐。创建者目录页面展示待同步项及重试入口，编辑页面将部分完成显示为“已保存，房间同步待恢复”。

本地原件对账只遍历进行中的单人活动；房间目录对账直接定位房间关联的活动，避免逐活动反复扫描房间集合。领域不变量和独立的本地／远端提交边界保留。

本轮约定的结构优化已完成：Store 职责、命令状态、类型化查询、应用生命周期、精准失效、轻量事务容器、分模块装配，以及跨提交点的明确结果与恢复入口。原生启动与前后台时序、网络切换仍需要微信真机验收。
