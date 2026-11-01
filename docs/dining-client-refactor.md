# DiningClient 职责拆分

本文描述客户端职责拆分；后续餐厅分类、活动餐厅范围和私人对象上传扩展见 [按餐厅分类创建用餐活动](restaurant-category-dining.md)。

`DiningClient` 负责输入金额解析、小票展示映射、餐厅选中状态、Vue 刷新通知和错误提示。创建房间、加入或恢复房间、初始化默认目录、退出及提交结果确认均委托给 `DiningSessions` 应用入口。单人活动的继续提示由 setup 页面负责；`DiningClient.startSingle` 仅创建活动，`resumeSingle` 仅恢复指定 Session，成功后停止房间监听。UI 不再读取业务存储键，也不管理 WebSocket、轮询或事件投影。

## 应用流程

`DiningSessionWorkflow` 通过 `DiningSessionActions` 调用已提交的用餐操作，通过 `RoomGateway` 分配或查找房间，通过 `RoomConnection` 管理同步生命周期，通过 `DiningPreferences` 读写设备偏好。`DiningApplication` 实现 `DiningSessionActions`，继续将业务操作转换为现有 UseCase 请求。

- 创建：用应用请求校验拒绝非法票价，再分配远端房间、记录上次房间、启动同步、调用多人创建用例及选取 Session。领域仍独立校验门票等不变量。
- 加入：解析房间号或读取上次房间，等待历史补齐，再通过应用查询判断是否恢复在线成员的 Session；其他情况调用加入用例，由领域判断房间状态及成员资格。
- 单人：`DiningSessionWorkflow.startSingle` 已删除。setup 查询所有未完成单人活动后提示继续或放弃并新建；继续时直接恢复原 Session，再进入 menu。创建和替换的业务事务由现有创建用例执行。
- 初始化：先初始化身份，只有本地原件目录完全为空时才发布注入的参考目录。已删除的原件仍计入存在性判断，不会重置用户清理过的目录。

这些流程跨远端提交与设备本地提交，不提供跨两者的原子事务；现有 `TransactionalInteractor` 的业务事务边界保持不变。已分配的房间在业务创建失败时仍保留为上次房间，便于核对提交结果。

## 基础设施与装配

`ManagedRoomConnection` 管理订阅、首次历史同步、每五秒补齐和事件缺口恢复。重复监听同一房间会等待同一个初始化 Promise；首次同步失败会关闭订阅并允许重连；停止后延迟建立的旧连接会关闭，旧通知会被忽略。应用创建或加入明确失败时停止连接；`UNKNOWN_COMMIT_OUTCOME` 和 `SYNC_PENDING` 保留后台补齐，不自动重发写命令。

`StorageDiningPreferences` 封装现有个人存储键。`ReferenceDiningCatalog` 保存原有默认目录配置。`DiningDevice` 负责装配这些实现，并向 UI 返回应用入口与偏好端口。没有更改存储 schema 或远端事件协议。

小票中的金额单位转换、轮次展示小计及“接近回本”的文案分级继续作为展示映射保留；领域中的消费核算和冻结结果保持原有实现。
