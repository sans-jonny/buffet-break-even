# 自助餐回本计算器

uni-app、Vue 3、TypeScript、Pinia 项目。按 Catalog 和 Dining 两个限界上下文组织；Dining 内部包含当前用餐、历史记录、小票收藏和完成流程。

应用层统一使用 `application/port/in`、`application/port/out` 和 `application/interactor`。每个 Input 的 Request / Response 保留为命名空间内部类，通过 Symbol Token 注入。

```text
npm run dev:h5
npm test
npm run type-check
npm run check:architecture
npm run build:h5
npm run build:mp-weixin -- --minify esbuild
```

测试自动发现 tests 下按业务和集成职责分组的用例。微信构建使用 esbuild；当前本地默认 Terser 存在依赖缺失，具体限制见文档。

多人模式需要额外安装后端依赖：`npm ci --prefix server`，随后通过 `npm run server:dev` 启动服务。前端通过 `VITE_ROOM_SERVER_URL` 配置 WebSocket 地址，本机默认 `ws://localhost:3001/ws`。运行 `npm test` 前会自动构建服务端。

- [多人模式、协议与部署](docs/multiplayer.md)
- [餐厅配置、自定义菜单与估值](docs/restaurant-catalog.md)
- [版本4存储与版本2协议迁移](docs/migration-v4.md)
- [更新记录](CHANGELOG.md)

- [业务边界与上下文图](docs/context-map.md)
- [领域模型与规则](docs/domain-model.md)
- [核心流程、事务、展示与存储](docs/core-logic.md)
- [重构结构、迁移和验证记录](docs/refactoring.md)
- [DDD 重设计提案：领域模型、事件与迁移路线（尚未实施）](docs/ddd-redesign.md)
- [Catalog 设计决策：简单 CRUD、职责与目录结构（尚未实施）](docs/catalog-design.md)
