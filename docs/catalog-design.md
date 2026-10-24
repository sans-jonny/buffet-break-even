# Catalog 设计决策

日期：2026-10-25。本文记录逐步讨论后确定的 Catalog 目标设计，尚未实施业务代码。关于 Catalog 的新设计，以本文为准；早期《DDD 重设计提案》和现状文档中的分层描述不作为本次实现要求。

## 业务职责与边界

Catalog 提供餐厅菜单，管理餐厅种类、餐厅、菜品分类、菜品及其参考估值。

Catalog 与 Dining 是不同限界上下文：Catalog 维护可修改的目录，Dining 使用某次用餐采用的菜单快照。Catalog 修改估值不改变已经开始的用餐或历史结果。Dining 获取菜单后转换为自己的类型并保存快照，不直接读取 Catalog 存储或共享可变模型。

“自定义”是一个固定的餐厅种类，与预置种类并列。用户只能在该种类中创建餐厅，当前不提供创建餐厅种类的能力。预置餐厅及菜单只读，自定义餐厅可维护。

## 已确定的能力

| 能力 | 说明 |
| --- | --- |
| 获取餐厅种类 | 返回预置种类及固定的“自定义”种类 |
| 获取种类中的餐厅 | 按种类 ID 查询餐厅列表 |
| 获取餐厅菜单 | 查询指定餐厅的菜品分类和菜品 |
| 创建自定义餐厅 | 固定归入“自定义”，调用方不能指定其他种类 |
| 添加菜品分类 | 为指定自定义餐厅添加分类 |
| 添加菜品 | 必须选择目标餐厅已有分类，并填写名称、份量单位、参考估值 |

修改、删除等其他 CRUD 操作的具体行为尚未逐项确定，不因“CRUD”这一架构选择而自动扩展功能范围。

## 数据与校验

| 数据对象 | 含义 |
| --- | --- |
| RestaurantType | 餐厅种类的 ID、名称 |
| Restaurant | 餐厅的 ID、名称、所属种类 |
| MenuCategory | 餐厅内部菜品分类的 ID、名称 |
| MenuItem | 菜品 ID、名称、分类引用、份量单位、参考单价 |
| RestaurantMenu | 餐厅信息、分类与菜品组成的完整菜单查询结果 |

菜品属于具体餐厅，不建立跨餐厅的全局商品中心。同名菜品在不同餐厅可以拥有不同身份和价格。参考价格与份量单位一起解释，例如“20 元／盘”。

必要校验直接放在对应 CRUD 操作中，包括名称和单位非空、参考价格为有限正数、ID 唯一以及分类归属有效。添加菜品时必须验证分类属于目标餐厅。具体 ID 唯一范围和存储字段细节在实现时进一步确定；金额计算采用整数分。

这些需求目前不足以要求复杂的领域模型、聚合、Policy 或领域事件。需要保留必要的数据合法性与引用完整性检查。

## 架构选择

参考 DDD 示例项目 Catalogue 的简单 CRUD 思路，Catalog 不采用六边形架构，不为每个操作建立 Input、Interactor、输出端口和 Repository 接口。

按业务概念组织代码，数据读写集中封装，保持公开入口明确。采用 CRUD 不等于把所有文件和逻辑堆在同一个目录或类中。

## 目标文件结构

```text
src/contexts/catalog/
├── Catalog.ts                         # 对外统一入口
├── CatalogConfiguration.ts            # 组装依赖
│
├── restauranttype/
│   ├── RestaurantType.ts              # 餐厅种类数据
│   └── RestaurantTypes.ts             # 查询种类列表
│
├── restaurant/
│   ├── Restaurant.ts                  # 餐厅数据
│   └── Restaurants.ts                 # 查询餐厅、创建自定义餐厅
│
├── menu/
│   ├── RestaurantMenu.ts              # 完整菜单查询结果
│   ├── RestaurantMenus.ts             # 查询餐厅菜单
│   ├── category/
│   │   ├── MenuCategory.ts            # 菜品分类数据
│   │   └── MenuCategories.ts          # 查询、添加分类
│   └── item/
│       ├── MenuItem.ts                # 菜品数据
│       └── MenuItems.ts               # 添加菜品、检查所属分类
│
└── persistence/
    ├── CatalogData.ts                 # 统一数据读写
    ├── PresetCatalog.ts               # 读取预置目录
    └── CustomCatalogStorage.ts        # 保存自定义目录
```

## 对象职责与依赖

| 对象 | 职责 |
| --- | --- |
| Catalog | 对外提供查询与维护 API，委托给相应业务对象，不集中实现全部 CRUD |
| CatalogConfiguration | 创建存储、数据访问与业务对象，组装 Catalog；不承载业务判断 |
| RestaurantTypes | 查询可用种类，包含固定的自定义分组 |
| Restaurants | 按种类查询餐厅；创建餐厅时固定使用自定义种类 |
| RestaurantMenus | 组装指定餐厅的完整菜单，提供独立查询结果 |
| MenuCategories | 查询、添加目标餐厅分类，校验目标存在且可编辑及分类输入 |
| MenuItems | 添加菜品，校验目标可编辑、输入合法、分类属于目标餐厅 |
| CatalogData | 封装预置和自定义数据的统一访问，供上述业务对象使用 |
| PresetCatalog | 读取预置数据，只读，不保存用户修改 |
| CustomCatalogStorage | 封装自定义目录的本地存储读写 |

单数对象描述数据，复数对象承担对应的查询、维护和校验。单数对象无需强制实现为带行为的类。

主要依赖方向：

```text
页面或 Dining 适配器
  → Catalog
    → RestaurantTypes / Restaurants / RestaurantMenus
      / MenuCategories / MenuItems
      → CatalogData
        → PresetCatalog / CustomCatalogStorage
```

业务对象不直接调用平台存储 API。添加菜品的分类归属校验由 MenuItems 通过 CatalogData 查询完成，不必为此调用另一层应用服务。

## 全项目 TypeScript 约定

每个 `.ts` 文件只有一个顶级对象，可以为顶级对象添加内部对象。这是用户对整个项目的要求，不限于 Catalog。

- 不建立集中声明多个顶级类型的 CatalogTypes.ts、Requests.ts 或 Responses.ts。
- 餐厅、分类、菜品等对象分别放入同名文件。
- 相关请求、响应如需内部组织，归属对应业务对象。
- 业务命名空间按上述概念分组，避免全部平铺。

TypeScript 的 `class` 与同名 `namespace` 合并在语法上仍是两个顶级声明。用户尚未明确是否允许这种实现形式，不能将其记为已获确认的例外。实现时需选择符合单顶级对象约束的表达方式，或先确认这一语法细节。

## 实施注意

本次仅保存设计，不修改现有业务实现，也不调整其他上下文。

现有架构守卫和调用方式要求 Catalog 使用公开 Input 及分层目录；实施此方案时，需要同步更新 Catalog 的守卫规则、测试、页面注入和 Dining 适配器。该变化仅针对 Catalog 的局部架构，不意味着其他上下文也必须改成 CRUD。

未来公开入口如需保留 public.ts，应只作导出用途，不在其中集中声明多个对象；最终导出方式在实现时确定。
