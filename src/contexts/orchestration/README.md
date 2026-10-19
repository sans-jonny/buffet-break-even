# 跨 Context 流程

此目录用于具有业务一致性要求的跨 Context 流程，仅通过其他 Context 的 public.ts 依赖 Port.In，不建立 Domain。

当前菜单查询由 Catalog 独立完成；用餐、轮次、结算、记录和收藏均由 Buffet 的同一份事务快照管理，没有跨 Context
写操作，因此暂不引入协调用例。结束用餐仍由 Buffet 一次保存完整快照。
