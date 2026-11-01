# 按餐厅分类创建用餐活动

每个 Restaurant 都包含独立的 `restaurantCategory: {id, name}`。它表示餐厅种类，区别于菜单内用于分类菜品的 `categories`。私人原件固定为 `{id: 'My', name: '我的餐厅'}`，复制到房间时保持这个分类。

setup 的 `cuisineTypes` 从本地 Catalog 的所有未删除餐厅提取分类，按 ID 去重；名称来自 Catalog，emoji 只在页面的 ID 到图标映射中配置，未知分类使用通用图标。“创造者模式”是单独的页面入口，只加入轮播的 `drumItems`，不作为虚构的 Catalog 分类。

## 应用入口与活动范围

```ts
await client.startSingle('200.00', cuisineTypeId)
await client.createRoom('200.00', cuisineTypeId)
```

两个 UI 入口都要求分类 ID。应用层按该 ID 查询餐厅；空分类拒绝创建。`DiningStarted` 保存 `restaurantCategoryId` 和本次选定的 `restaurantIds`。私人餐厅在多人活动中的 ID 为 `roomId:sourceId`。菜单只展示活动的餐厅，领域在创建消费及核算结果时校验餐厅是否属于活动；之后新增的其他餐厅不会自动加入这次活动。

单人入口由 setup 页面先查询全部未完成的单人活动，再提示用户。选择“继续用餐”时恢复原 Session 并直接进入菜单，不校验新输入的票价，也不按当前分类过滤旧活动，因此旧版未标记分类的活动也可以恢复。选择“放弃旧用餐并新建”时显式传入 replaceActivityId，在同一业务事务内放弃旧活动并创建当前分类的新活动；创建失败会回滚放弃操作。关闭提示不会修改活动。没有未完成活动时直接创建。底层应用 API 的可选分类参数仅用于兼容已有调用；UI 不使用无分类路径。

## 私人持久化对象上传

创建多人用餐时，`RoomRestaurantPublisher` 端口交给 `RoomRestaurantPersistence` 读取所选私人餐厅的本地持久化对象，原样上传到：

- `POST /rooms/:roomId/private-restaurants`，请求体为 `{restaurants: [...]}`。
- `GET /rooms/:roomId/private-restaurants`，返回原始对象数组。

上传与服务器存储不构造 Domain 对象，不调用 `copyIntoRoom`，也不产生私人餐厅的初始 `RestaurantPublished` 事件。服务器只验证文档格式，保存在 `RoomStream.catalogDocument` 中；相同文档可重复上传，不同文档不可覆盖已设定的基线，首次设定只允许在事件流版本为零时进行。

本地回放时，基础设施先下载基线，再以稳定 ID 映射恢复房间目录，随后应用业务事件。基线只填充缺失记录，避免覆盖后续修改。私人餐厅之后的调价、删除和消费对账沿用现有目录同步事件；重建先恢复初始基线，再回放这些变化。公共餐厅沿用现有发布事件。

基线上传与事件提交是两个独立持久化步骤：上传失败不会提交用餐活动；上传成功但后续提交失败可能留下未使用的房间基线。不能将它们视为跨 HTTP 的原子事务。

## 升级

服务器新增迁移 `20261101010000_private_restaurant_records`，启动新版服务器前运行 `npm run db:migrate`。新客户端和新服务器应一起升级。

旧餐厅记录在持久化读取适配器中兼容：私人餐厅或房间副本归入 `My`，未标注分类的公共餐厅归入 `Other / 其他餐厅`，不猜测其菜系。旧活动缺少餐厅集合时保留原有范围，历史事件不重写。
