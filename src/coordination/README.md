# Coordination 内容分类

这里按职责整理现有协调代码。分类仅用于导航，保留既有 Context、应用端口和事务边界。

`application/port/in`、`application/port/out`、`application/use-case` 下使用相同的分类目录：

| 分类 | 内容 | 示例 |
| --- | --- | --- |
| `initialization` | 应用初始化编排 | `InitializeDining` |
| `device` | 设备身份、昵称、当前选择和个人数据读取 | `InitializeIdentity`、`SelectDiningSession`、`GetPersonalDining`、`LocalDiningData` |
| `session` | 页面发起的会话流程及连接、恢复能力 | `StartSingleDining`、`CreateDiningRoom`、`JoinDiningRoom`、`RoomConnection` |
| `dining` | 用餐活动与消费操作的跨 Context 协调 | `CreateSingleDining`、`IncreaseDiningProduct`、`EndDining` |
| `room` | 房间成员与角色操作的协调 | `JoinMultiplayerDining`、`LeaveDiningRoom`、`TransferDiningHost` |
| `catalog` | 餐厅原件发布、删除、房间目录同步及消费对账 | `PublishLocalRestaurant`、`SyncRoomRestaurant`、`RoomRestaurantPublisher` |
| `records` | 个人小票和用餐历史的保存、删除 | `SaveReceipt`、`SaveDiningHistory` |

共享 DTO 位于 `application/dto`。`composition/CoordinationComposition.ts` 只负责委托：用餐与房间命令由 `DiningComposition` 注册，目录协调由 `CatalogCoordinationComposition` 注册，身份与个人记录由 `DeviceComposition` 注册，设备会话流程由 `SessionComposition` 注册。业务依赖使用作用域内的延迟工厂。

`application/service` 保存复用的内部协作逻辑：`DiningAccess` 统一房间授权，`EditableDiningRound` 准备当前轮次。它们通过公开输入端口协作，不持有业务存储或跨事务状态。

`session` 面向用户发起的完整流程，连接远端分配、同步和本地提交；`dining`、`room` 中的用例承担具体业务操作。身份与当前选择放在 `device`，收藏和历史写操作放在 `records`；现有 `LocalDiningData`、`GetPersonalDining` 仍统一读写设备个人数据，此次不拆分存储契约。

这些分类不是新的 DDD Context，也不代表职责迁移已经完成。后续若将单一 Context 的操作迁回其所属模块，应另行调整依赖和业务边界。
