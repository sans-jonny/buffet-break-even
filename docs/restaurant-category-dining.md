# 按餐厅分类创建用餐活动

每个 Restaurant 都包含独立的 `restaurantCategory: {id, name}`。它表示餐厅种类，区别于菜单内用于分类菜品的 `categories`。私人原件固定为 `{id: 'My', name: '我的餐厅'}`，复制到房间时保持这个分类。

setup 的 `cuisineTypes` 从本地 Catalog 的所有未删除餐厅提取分类，按 ID 去重；名称来自 Catalog，emoji 只在页面的 ID 到图标映射中配置，未知分类使用通用图标。“创造者模式”是单独的页面入口，只加入轮播的 `drumItems`，不作为虚构的 Catalog 分类。

## 应用入口与活动范围

```ts
await client.startSingle('200.00', cuisineTypeId)
await client.createRoom('200.00', cuisineTypeId)
```

两个 UI 入口都要求分类 ID。应用层按该 ID 查询餐厅；空分类拒绝创建。`DiningStarted` 保存 `restaurantCategoryId` 和本次选定的 `restaurantIds`。私人餐厅在多人活动中的 ID 为 `roomId:sourceId`。菜单只展示活动的餐厅，领域在创建消费及核算结果时校验餐厅是否属于活动；之后新增的其他餐厅不会自动加入这次活动。

单人入口由 setup 页面先查询全部未完成的单人活动，再提示用户。选择“继续用餐”时恢复原 Session 并直接进入菜单，不校验新输入的票价，也不按当前分类过滤旧活动。选择“放弃旧用餐并新建”时显式传入 replaceActivityId，在同一业务事务内放弃旧活动并创建当前分类的新活动；创建失败会回滚放弃操作。关闭提示不会修改活动。没有未完成活动时直接创建。应用 API、领域事件与持久化活动都要求有效分类和非空餐厅集合，不再提供无分类路径。

## 私人持久化对象上传

创建多人用餐时，`RoomRestaurantPublisher` 端口交给 `RoomRestaurantPersistence` 读取所选私人餐厅的本地持久化对象，原样上传到：

- `POST /rooms/:roomId/private-restaurants`，请求体为 `{restaurants: [...]}`。
- `GET /rooms/:roomId/catalog`，一起返回餐厅基线与独立的图片元数据。

上传与服务器存储不构造 Domain 对象，不调用 `copyIntoRoom`，也不产生私人餐厅的初始 `RestaurantPublished` 事件。服务器只验证文档格式，保存在 `RoomStream.catalogDocument` 中；相同文档可重复上传，不同文档不可覆盖已设定的基线，首次设定只允许在事件流版本为零时进行。

本地回放时，基础设施先下载基线，再以稳定 ID 映射恢复房间目录，随后应用业务事件。基线只填充缺失记录，避免覆盖后续修改。私人餐厅之后的调价、删除和消费对账沿用现有目录同步事件；重建先恢复初始基线，再回放这些变化。公共餐厅始终使用本地目录，不向房间发布公开菜单事件。

基线上传与事件提交是两个独立持久化步骤：上传失败不会提交用餐活动；上传成功但后续提交失败可能留下未使用的房间基线。不能将它们视为跨 HTTP 的原子事务。

## 当前数据基线

服务端仅使用 `20261102000300_baseline`。旧数据不升级，开发数据库通过 `npm run db:reset` 清空重建。餐厅分类、活动分类和餐厅集合缺失时拒绝读取或创建，不再补填 My/Other 或放开活动范围。
