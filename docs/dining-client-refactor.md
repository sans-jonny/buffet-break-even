# Page、Query 与 UseCase 职责

应用采用 UniApp、Vue 3、TypeScript、Pinia 和 TanStack Query Core。Page 是输入适配器；Domain 与 Application 不依赖 Vue、Pinia 或 Query Core。

## 注入与查询

Composition Root 创建根 `UniAppUseCaseScope`，通过其类型化 token 提供给 Vue。页面调用 `useScope()` 取得既有容器，再用 `scope.resolve(ReactiveQueryFacade.token)` 和具体 UseCase token 解析依赖。`useScope()` 不创建容器，也不包装业务操作。

`QueryClient`、`QueryRegistry`、`ReactiveQueryFacade` 和 `QueryInvalidationAdapter` 在每个应用根中各有一个实例。注册定义集中在 `DiningQueries`，包含 Token、Request 工厂、输入端口、QueryKey 及失效匹配。缓存保存完整 Response，不以 `.value` 的副本建立第二份业务缓存。业务 Store 和旧 QueryClientProvider 已删除；测试中的旧场景语法仅存在于 `tests/support/legacy`，通过生产门面和输入端口执行。

```ts
const scope = useScope()
const queries = scope.resolve(ReactiveQueryFacade.token)
const consumption = queries.bind(DiningQueries.Consumption, () => {
  const session = personal.data.value?.session
  const restaurantId = selectedRestaurantId.value
  return session && restaurantId ? {activityId: session.activityId, restaurantId} : undefined
})
```

Token 标识查询定义，QueryKey 标识带参数的具体实例。Page 提供参数源，注册表构造 Request 和 QueryKey。参数必须是可 JSON 序列化的 DTO；绑定保留快照，不把 Vue ref 放入缓存键。`undefined` 表示上下文未就绪，不创建 Request 或缓存条目。参数变化切换 Observer，旧请求完成只更新自己的缓存实例。

绑定返回只读的 `data`、`status`、`isFetching`、`error`，以及 `refresh`、`pause`、`resume`、`dispose`。每个页面拥有独立 Observer；相同 QueryKey 共享缓存与请求。异步读取展示 pending、错误和重试入口；已注册的同步本地查询可直接将完整 Response 初始化到 QueryClient，避免空白首帧。首次同步读取失败不会自动重试，仍可显式刷新。

默认 `staleTime: Infinity`、`retry: false`、`networkMode: always`，应用缓存回收时间为五分钟。无平台核心装配使用无限回收时间，资源由 dispose 释放。查询读取已提交的本地投影，离线可用；核算日期在实际查询执行时生成。

## 提交、事件与生命周期

命令链路是 `Page → Request → Port.In → Interactor → Domain → Repository`。Page 直接调用命令，不用 Command Response 覆盖查询缓存。`CommandState` 只保存本页面命令计数和错误，不持有查询租约，不等待或重试查询。

沿用 BatchRuntime 的提交后订阅作为 EventBus。只有完整本地投影发布后才通知 `DataInvalidationEvent`；事务回滚不通知，多人 HTTP 响应也不直接发布本地数据。事件包含数据标识，不包含 Response 或 QueryKey。适配器合并同一轮重复标识，通过注册定义匹配现有 QueryKey。详情、列表、个人汇总和核算可同时失效；刷新复用绑定的 Request 参数，事件不负责重建筛选或分页上下文。

页面隐藏时暂停自身绑定，显示时恢复并刷新失效查询；卸载和 Vue scope 销毁时幂等释放。一个页面释放不影响其他页面。根容器仍共享，页面不会创建“当前对象”的全局可变查询状态。

App 前台恢复通过 `DiningAppLifecycle` 管理房间连接与同步，并重取活跃失效查询；网络从断开恢复时只在前台重新同步。UniApp 网络监听在销毁时移除，不依赖浏览器 window。后台迟到的恢复结果不会启动新的前台连接。

## 业务校验与事务

输入自身的业务约束由 Request 构造函数验证，抛出 `InvalidRequestError`。共用输入函数仍由 Request 调用，包括数量、金额、昵称和完整目录结构；表单条目编辑通过 `RestaurantInput.CategoryRequest` / `ProductRequest` 校验。金额文本解析负责解码，安全整数及业务范围由 Request 验证。

状态相关规则由 Domain 方法维护，包括活动终态、轮次锁定、数量不足及累计溢出、目录可用性、已有目录中的商品关系、房间活动匹配及成员资格。Application 取得必要事实并调用所属上下文的输入端口，不复制这些条件。协议解码、快照重建完整性、并发与版本约束保留。

复用 `TransactionRunner` 作为文档中的 TransactionPort。Page 需要事务时通过 scope.resolve 获取；事务内按既有事务作用域解析输入端口。跨入口都必须成立的组合业务规则保留在 Application。已被服务端确认的事件不通过本地回滚撤销。

## 页面状态与会话编排

Pinia 只保存交互和恢复状态。菜单状态按活动与餐厅分槽，选中餐厅由菜单、轮次和结果页面共享；会话恢复提示由 SessionPageStateStore 保存。状态不复制 Query Response，持久化暂不新增。

创建、加入、恢复、离开等流程仍由各自独立 UseCase / Interactor 实现，依赖 RoomGateway、RoomConnection 和 DiningPreferences。SessionOperationCoordinator 在 Application 层装饰创建、加入和恢复入口，实现跨页面互斥；选择失败保留已提交 Session，恢复只重试选择，不重复创建或加入。房间分配、业务提交和个人选择保留真实提交边界，不提供跨远端操作的虚假原子事务。

Bootstrap.device 完成依赖注册、媒体初始化、身份及默认目录初始化后才挂载页面；失败时释放连接、网络监听、查询及页面状态资源。
