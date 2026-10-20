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

- [业务边界与上下文图](docs/context-map.md)
- [领域模型与规则](docs/domain-model.md)
- [核心流程、事务、展示与存储](docs/core-logic.md)
- [重构结构、迁移和验证记录](docs/refactoring.md)
