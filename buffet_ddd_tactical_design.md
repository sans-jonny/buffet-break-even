# 自助餐省钱神器 — DDD 战术设计说明书（最终整合版）

> **状态**：依据战略设计 BR-89 校准版及后续确认的 M01–M23 决策整合  
> **编制日期**：2026-10-31  
> **技术栈**：UniApp + Vue 3 + TypeScript（客户端）；Node.js + TypeScript（服务端）；SQLite；服务端 Prisma；客户端本地 SQLite；pnpm workspace；Awilix；EventEmitter3；Pinia Setup Store + TanStack Query Core  
> **配套文档**：《自助餐省钱神器_DDD战略设计_最终版.md》  
> **基本原则**：战略设计规定业务含义；本文件规定代码边界与实现约束。如发现与校准后的战略规则冲突，以战略规则和用户更晚明确的决策为准。本文代码为结构性示例，非未经适配即可直接运行的完整项目。

---

## 1. 战术设计目标与最终约束

1. **三大限界上下文**：Dining Accounting（核心）、Restaurant Catalog（支撑）、Dining Collaboration（支撑）。跨上下文流程放在独立的 **Application Coordination** 包中，不把它称作第四个限界上下文，也不赋予它领域模型。
2. **单人/多人共享 Domain + Application Interactor**：单人本地运行相同的核心用例；多人经 HTTP Remote Port.In 适配器请求服务端执行同一 Interactor。单人并非多人模式的“只有一个人的虚拟房间”。
3. **事件产生式领域模型，而不是 Event Sourcing**：聚合方法只产出精确的面向对象 DomainEvent（包括失败事件）；不直接改变现有聚合对象。成功事件由 Repository.apply() 应用到数据库，随后重新构建聚合；失败事件由 Application 转为异常，不被持久化应用。
4. **只定义两类事件**：`DomainEvent`（事务内发布并立即 `await` 全部处理器）和 `DataInvalidationEvent`（提交后发布以通知缓存失效）。不定义 `IntegrationEvent`，DomainEvent 不在 TransactionScope 中排队。
5. **Repository.apply() 负责**：版本条件检查、持久化状态变更、收集数据失效、立即发布成功 DomainEvent、最后重建聚合。它要求一个活动事务，但不自行创建/提交事务。
6. **事务层**：服务端 Prisma SQLite 交互式事务 + Node `AsyncLocalStorage`；同一服务器内的不同 Context Repository 使用同一个事务客户端。嵌套用例复用事务；任一同步 Handler 失败则整体回滚。
7. **成功返回、失败抛异常**：UseCase.Response 只表示成功。请求错误、业务失败、未找到、权限、并发冲突及技术错误使用异常，不定义带 `SUCCESS/REJECTED` 判别的响应。
8. **统一门票是整次活动合计价格**：`ticketPriceMinor > 0`；不按人数相乘。多人仅当前房主可在结束前修改。结束时固定金额。
9. **最终结果是最小完备消费快照**：不复制或保存完整 CatalogSnapshot，只固定餐厅名称、选中餐厅实际消费菜品名称/单价/数量/小计、轮次、完成时有效成员、整次门票总额及合计。
10. **不实施网络请求级幂等去重**：重复到达的添加商品等命令按正常规则分别执行。已结束再次结束抛业务异常；不要由 HTTP 框架自动重试非幂等写请求。
11. **优先正确性**：大型聚合分批读取、局部 SQL、性能缓存和增量重建均留到后续，不作为当前战术设计前提。

### 1.1 必须尊重的战略细则

- 一次 DiningActivity 可比较多家餐厅；只有显式选择的 `finalRestaurantId` 进入正式结果。
- 每家餐厅最多一个未提交 Round。手动提交非空 Round 时，原子地产生下一空 Round；不可由用户直接删 Round，只能清空其中的商品。
- **已提交和未提交 Round 均计入实时金额与中途小票**；结束时非空未提交 Round **自动视为提交**，空 Round 忽略，**不新建下一轮**。
- 允许最终餐厅无任何菜品而正常结束，`foodTotalMinor=0`、`netValueMinor=-ticketPriceMinor`。
- 商品删除要影响进行中的已提交/未提交 Round；被清空的已提交 Round 删除、未提交 Round 保留、展示序号连续，稳定 `roundId` 不变。
- 目录变更可有传播窗口（M11B），但生成正式结果前必须核验清理完成及目录一致；不能对缺失商品默认为零元。
- 成员小票是**各自本地保存的整房消费结果**；不记录“每份食物由哪个成员吃掉”。只有完成时仍在房间且服务端确认为在线的成员进入最终结果与领取资格集合。
- 已完成房间只允许完成时合格的成员重入取结果；空房间保留 10 分钟后可回收，重入与回收按服务端实际生效顺序判定。

---

## 2. 代码包边界与依赖规则（M01）

采用 pnpm workspace，将每个 BC 分为对外契约与内部实现两个物理包：

```text
packages/
├── kernel/
│   ├── application/                  # UseCase、TransactionRunner、TransactionalUseCase
│   ├── domain/                       # Entity/Aggregate/VO、DomainEvent、DomainEventBus
│   └── invalidation/                 # DataInvalidationEvent、Bus 与 CollectorPort
├── accounting/
│   ├── contracts/                    # 对外 Port.In、Request/Response、只读 DTO
│   └── core/                         # Domain、Interactor、内部 Port.Out
├── catalog/
│   ├── contracts/
│   └── core/
├── collaboration/
│   ├── contracts/
│   └── core/
└── coordination/
    ├── contracts/                    # 跨 BC 对外用例契约
    └── core/                         # 无 Domain 的跨 BC Interactor

apps/
├── server/
│   └── src/
│       ├── adapters/http/
│       ├── adapters/websocket/
│       ├── infrastructure/prisma/
│       ├── infrastructure/events/
│       ├── infrastructure/transactions/
│       ├── infrastructure/catalog-cleanup/
│       └── composition/
└── uniapp/
    └── src/
        ├── pages/
        ├── stores/
        ├── infrastructure/local/
        ├── infrastructure/remote/
        ├── infrastructure/events/
        └── composition/
```

依赖规则：

- 各 BC **Core → 自己的 Contracts + Kernel**；Core 不得依赖其他 BC 的 Core。
- Coordination Core → 各 BC 的 **Contracts** + Kernel，而非其他 BC Core；它只编排，不持有 Domain 业务状态。
- Infrastructure Adapter 可以依赖实现所需的 Core/Contracts，但业务模块绝不反向依赖 Prisma、HTTP、Vue 或 EventEmitter3。
- 各 Contracts 不直接依赖其他 BC Contracts，也不暴露 Domain Entity。跨上下文数据在 Coordination 转换为目标 BC 所需的输入 DTO。
- 使用 `exports`、TypeScript 项目引用以及 ESLint/dependency-cruiser 维护包边界。遵循 REP/CCP/CRP、ADP/SDP/SAP，避免无意义的单类物理包。
- 页面的放置保持在 `apps/uniapp/src/pages`；Store 也在应用层按页面/交互职责集中管理。BC 的 Infrastructure Adapter 可访问应用 Store，但 Core 不可访问 Store。

---

## 3. 领域模型与聚合边界（既定 T01–T19）

### 3.1 Accounting

| 领域对象 | 类型 | 负责规则 |
|---|---|---|
| `DiningActivity` | 聚合根 | 活动状态、票价总额、候选餐厅标识、最终餐厅、冻结 `DiningResult` |
| `RestaurantConsumption` | 独立聚合根 | 一家餐厅的轮次、商品数量、已提交锁定、删除商品系统清理、展示编号、版本 |
| `Round` | RestaurantConsumption 内部实体 | 稳定 `roundId`、展示顺序、ACTIVE/SUBMITTED、是否允许用户编辑 |
| `ConsumptionItem` | 值对象 | `productId + quantity`，数量非负，不持有成员 ID |
| `DiningResult` | 不可变值对象 | 本次完成所需最小完备结算数据，随 DiningActivity 结束固定 |
| `ConsumptionCalculator` | 领域服务 | 根据轮次数量、商品名称/有效价格、总门票计算明细/盈亏 |
| `Money` | 值对象 | 按最小货币单位运算、检查合法范围和币种 |

`DiningActivity` 与 `RestaurantConsumption` **不因归属同一次活动就合并为一个聚合**。它们通过 ID 联系；涉及两个聚合的完成或目录清理流程由 Application Coordination 调用公开用例并通过共享事务协调。

`RestaurantConsumption` 只持有业务有效的商品标识和数量，**不保存商品单价为永久属性**。运行中单价来自 Catalog 最新有效目录，已提交 Round 价格同样可以变化。

**禁止**用户修改 SUBMITTED 轮次；由目录删除导致的系统级清理不属于用户编辑。删除商品后，若已提交轮次变空则删该轮次；未提交轮次变空仍保留。更新展示编号时稳定 Round ID 不变。

### 3.2 Catalog

`Restaurant` 是唯一聚合根，`Category`、`Product` 是其内部实体。`RestaurantType = PUBLIC | PRIVATE | ROOM_COPY`，餐厅和商品需要稳定身份，不能用名称作为唯一键。删除分类级联删除其产品；目录变化产生新 Restaurant 版本。

私人餐厅房间副本是逻辑上的独立目录：创建时复制出副本并保持来源 ID 映射。后续完整目录同步须区分“同一商品更新”和“真正删除商品”，不得因重新生成副本 ID 将全部商品误判删除。房间副本只有原创建者在符合资格时能够更新；房主角色不赋予编辑副本权。

过去战术讨论中的“独立完整 CatalogSnapshot 值对象”**被后续 M14 结果规则覆盖，不用于持久化完成快照**。查询时允许存在携带 `restaurantVersion` 的只读价格数据视图，但它不等于必须存储完整餐厅目录。

### 3.3 Collaboration

`DiningRoom` 为聚合根，`RoomMember` 为内部实体，包含创建者标识、当前房主、房间成员状态、服务端确认的在线状态、进入顺序、关联活动 ID、完成时有资格领取结果的成员 ID 集合等。`RoomStatus = ACTIVE | ENDED | ABANDONED`；空房间使用 `EmptySince` 作为回收判断依据。

不把房间成员、房主、在线状态、匿名身份放入 Accounting Domain。当前房主退房或已被服务端确认离线时，在同一事务内重新选举当前最早加入且在线的成员。无人在线可无房主，首位成功重入者获得房主；有人在线时恰一名房主。

成员匿名 UUIDv7 由客户端持久保存并提交服务端。它是**标识符而非强身份认证凭据**；此方案接受弱认证风险，不能宣传为能防止他人冒用身份。

### 3.4 领域边界一致性矩阵

| 业务不变量 | 聚合内 / 协调维护 |
|---|---|
| 每餐厅最多一个 ACTIVE Round；提交后自动创建下一 Round | RestaurantConsumption 内 |
| 一次用餐活动的总票价始终大于零；结束不可逆 | DiningActivity 内 |
| 商品属于活动允许的餐厅，删除后不可重新添加 | Catalog + Accounting 的协调校验 |
| 当前房主才能提交、完成、放弃、转让、修改门票 | Collaboration 校验 + Decorator |
| 用餐完成同时固定参与成员、轮次、价格和房间状态 | Coordination 共享事务 |
| 进行中商品目录删除后的消费清理 | Catalog 事务内记录清理状态；Accounting 后续独立事务，最终一致 |
| 已完成结果/已保存小票不因目录变化而改动 | Accounting 不可变结果 + 客户端本地保存 |

---

## 4. UseCase 契约、Request/Response 与异常（M02–M04、M09）

每个公开 UseCase 在自己的 Contracts 中独立占一个 `.ts` 文件，顶层公开 `interface` + 同名 `namespace` 内的 `Request`、`Response`；只有高度内聚的 DTO 才嵌套，确有复用价值时才提取。

```typescript
export interface UseCase<
  TRequest extends UseCase.Request,
  TResponse extends UseCase.Response
> {
  execute(request: TRequest): Promise<TResponse>;
}

export namespace UseCase {
  export abstract class Request {}
  export abstract class Response {}
}
```

```typescript
export interface ChangeTicketPriceUseCase extends UseCase<
  ChangeTicketPriceUseCase.Request,
  ChangeTicketPriceUseCase.Response
> {}

export namespace ChangeTicketPriceUseCase {
  export class Request extends UseCase.Request {
    constructor(
      public readonly activityId: string,
      public readonly ticketPriceMinor: number
    ) {
      super();
      if (typeof activityId !== "string" || !activityId.trim())
        throw new InvalidRequestError("activityId");
      if (!Number.isSafeInteger(ticketPriceMinor) || ticketPriceMinor <= 0)
        throw new InvalidRequestError("ticketPriceMinor");
    }
  }

  export class Response extends UseCase.Response {
    constructor(
      public readonly activityId: string,
      public readonly version: number
    ) { super(); }
  }
}
```

约束：

- Request 使用**显式类型、独立构造参数**，在构造中直接检查不可信 HTTP/本地输入。不要统一改成 `constructor(raw: unknown)`，不要强制引入 Zod。
- Response 仅返回成功数据；可按需定义内部嵌套查询 DTO。HTTP JSON 应正确映射成 Request 实例；远程 Port.In Adapter 负责把 HTTP 错误还原为本地一致的异常类型。
- `InvalidRequestError`、`BusinessRuleError`、`AuthorizationError`、`NotFoundError`、`ConcurrencyConflictError`、技术错误统一向上抛出。HTTP 层示例映射为 400/403/404/409/5xx，但不把错误塞进 `Response`。
- Domain 产生失败事件（例如 `TicketPriceChangeRejected`、`DiningEndRejected`），由 Application 转成 `BusinessRuleError`；失败事件**不调用 Repository.apply()**。
- 不需要 `AtomicWorkflowDecorator`、`WorkflowRejected`，跨 BC Interactor 直接继承 `TransactionalUseCase`。
- 没有用户命令请求级去重：不引入 `IdempotencyKey`/去重表；分别通过校验并提交的重复命令分别生效。`ALREADY_ENDED` 是状态不变量的失败，不是重放先前响应。

### 4.1 TransactionalUseCase

```typescript
export abstract class TransactionalUseCase<
  TRequest extends UseCase.Request,
  TResponse extends UseCase.Response
> implements UseCase<TRequest, TResponse> {
  protected constructor(private readonly transactions: TransactionRunner) {}

  execute(request: TRequest): Promise<TResponse> {
    return this.transactions.run(() => this.executeInTransaction(request));
  }

  protected abstract executeInTransaction(request: TRequest): Promise<TResponse>;
}
```

纯计算/只读能力可实现一般 `UseCase`，是否使用事务由调用边界决定；需要与完成结果保持一致的读取，由 Coordination 在一个事务内统一完成。

---
## 5. 两种事件与同步分发规则（M12B）

**系统仅有两类事件**：`DomainEvent`、`DataInvalidationEvent`。前者承载业务变化；后者只通知查询缓存失效。两者均为精确的面向对象类型，事件实例本身不会自动产生数据库副作用。

| 项目 | DomainEvent | DataInvalidationEvent |
|---|---|---|
| 产生者 | 聚合领域方法 | Repository 应用成功事件后收集 |
| 分发者 | DomainEventBus | DataInvalidationEventBus |
| 时间 | **Repository.apply() 修改成功后、Commit 前立即发布** | **最外层事务 Commit 后发布** |
| 调用语义 | 顺序 `await` 处理器；异常向上传播、回滚 | 各订阅者失败隔离，已经提交的事务不回滚 |
| 能否执行业务命令 | 可，经其他 Application UseCase、共享当前事务 | 否；只处理订阅、通知、缓存失效 |
| 存入 TransactionScope | **否** | 是：只存需要在提交后发布的失效事件 |
| 是否需持久化事件流 | 否；不是 Event Sourcing | 否；断线后靠查询与版本核对恢复 |

### 5.1 DomainEventBus 抽象与 EventEmitter3 包装

```typescript
export abstract class DomainEvent {}

export interface DomainEventBus {
  subscribe<T extends DomainEvent>(
    type: DomainEventBus.Type<T>,
    handler: DomainEventBus.Handler<T>
  ): () => void;
  publish(event: DomainEvent): Promise<void>;
}

export namespace DomainEventBus {
  export type Type<T extends DomainEvent> = Function & { prototype: T };
  export interface Handler<T extends DomainEvent> {
    handle(event: T): Promise<void>;
  }
}
```

```typescript
import EventEmitter from "eventemitter3";

export class EventEmitter3DomainEventBus implements DomainEventBus {
  private readonly emitter = new EventEmitter();
  private readonly eventKeys = new WeakMap<Function, symbol>();

  private key(type: Function): symbol {
    let key = this.eventKeys.get(type);
    if (!key) {
      key = Symbol(type.name);
      this.eventKeys.set(type, key);
    }
    return key;
  }

  subscribe<T extends DomainEvent>(
    type: DomainEventBus.Type<T>,
    handler: DomainEventBus.Handler<T>
  ): () => void {
    const key = this.key(type);
    const listener = (event: T) => handler.handle(event);
    this.emitter.on(key, listener);
    return () => this.emitter.off(key, listener);
  }

  async publish(event: DomainEvent): Promise<void> {
    const key = this.key(event.constructor);
    for (const listener of this.emitter.listeners(key)) {
      await listener(event);
    }
  }
}
```

`EventEmitter3.emit()` 自身**不等待 Promise**，因此必须通过 `listeners()` 逐个 `await`，不可用 `void publish(...)` 或直接 `emitter.emit(...)` 代替。事件的类构造函数在进程内标识精确类型，不要求额外声明 static 字符串。子类匹配遵循精确类匹配，如需父类通配订阅应显式另行设计。

所有处理器均在 Composition Root **注册一次**。不得按 HTTP 请求重复订阅。一个处理器触发新的 DomainEvent 时按同步嵌套调用链执行；需要通过业务规则防止 A→B→A 无限递归。

### 5.2 DataInvalidationEventBus

```typescript
export abstract class DataInvalidationEvent {
  abstract readonly aggregateKey: string;
  abstract readonly version: number;
}

export interface DataInvalidationEventBus {
  subscribe<T extends DataInvalidationEvent>(
    type: Function & { prototype: T },
    handler: { handle(event: T): Promise<void> }
  ): () => void;
  publish(event: DataInvalidationEvent): Promise<void>;
}
```

实现也可包一层 EventEmitter3，但发布时对每个订阅者单独 `try/catch + logger`，一个网络发送或 Store 监听失败不影响其他订阅者。**绝不将通知失败作为原事务回滚理由。**

失效通知按聚合根产生，例如 `RestaurantInvalidated(restaurantId,version,target)`、`ConsumptionInvalidated(consumptionId,version,target)`、`DiningActivityInvalidated(activityId,version,target)`、`DiningRoomInvalidated(roomId,version,target)`。`target` 用于区分本地活动和远程房间/作用域；不得以同名 ID 混合两个作用域。

### 5.3 InvalidationCollector

一次事务可能多次改变相同聚合，失效事件按 `aggregateKey` 合并并保留最高版本：

```typescript
export class InvalidationCollector {
  private readonly events = new Map<string, DataInvalidationEvent>();

  add(event: DataInvalidationEvent): void {
    const previous = this.events.get(event.aggregateKey);
    if (!previous || event.version > previous.version)
      this.events.set(event.aggregateKey, event);
  }

  snapshot(): readonly DataInvalidationEvent[] {
    return [...this.events.values()];
  }
}
```

`aggregateKey` 至少包含聚合类型、作用域及聚合 ID。事务回滚即丢弃 Collector；成功 Commit 后发布 `snapshot()`。通知尽力而为，不假定 WebSocket 一定可靠；客户端重连时需重新检查实际版本/刷新查询。

---

## 6. 事务、PrismaSession 与异常传播（M08、M09）

### 6.1 TransactionScope

```typescript
export interface TransactionScope {
  readonly tx: Prisma.TransactionClient;
  readonly invalidations: InvalidationCollector;
}
```

**没有 `domainEvents` 字段**。DomainEvent 一发布就立即由处理器执行。实现可以有 `TransactionRunner`、`PrismaSession`、`InvalidationCollectorPort` 抽象，由服务端组合根注册同一实现或适配器。

```typescript
export interface TransactionRunner {
  run<T>(action: () => Promise<T>): Promise<T>;
}

export interface PrismaSession {
  requireTransaction(): Prisma.TransactionClient;
}

export interface InvalidationCollectorPort {
  add(event: DataInvalidationEvent): void;
}
```

### 6.2 PrismaTransactionRunner 核心

```typescript
export class PrismaTransactionRunner
  implements TransactionRunner, PrismaSession, InvalidationCollectorPort {
  private readonly als = new AsyncLocalStorage<TransactionScope>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly invalidationBus: DataInvalidationEventBus,
    private readonly logger: Logger
  ) {}

  requireTransaction(): Prisma.TransactionClient {
    const tx = this.als.getStore()?.tx;
    if (!tx) throw new Error("Active transaction required");
    return tx;
  }

  add(event: DataInvalidationEvent): void {
    const scope = this.als.getStore();
    if (!scope) throw new Error("Active transaction required");
    scope.invalidations.add(event);
  }

  async run<T>(action: () => Promise<T>): Promise<T> {
    if (this.als.getStore()) return action(); // 嵌套：复用同一事务

    const collector = new InvalidationCollector();
    const result = await this.prisma.$transaction(tx =>
      this.als.run({ tx, invalidations: collector }, action)
    ); // 运行到此处说明已 Commit

    for (const event of collector.snapshot()) {
      try {
        await this.invalidationBus.publish(event);
      } catch (error) {
        this.logger.error(error);
      }
    }
    return result;
  }
}
```

该代码展示**事务传播与发布时序**，非完整生产实现。事务重试、日志、SQLite 锁冲突、结束后异步上下文泄漏均需按项目实际 Prisma/Node 版本补齐。

实现约束：

1. 一旦外层事务已经存在，内层 `TransactionalUseCase` 必须复用它，不自行 Commit、不创建独立保存点；某层失败需**抛出异常**，不得捕获后偷偷继续执行。
2. 同一业务操作涉及各 BC Repository 时，服务端必须同属一个 SQLite 数据库及 `Prisma.TransactionClient`。跨 HTTP 调用另一个 Interactor **不属于共享事务**。
3. 不在一个事务中随意并行执行 `Promise.all` 多个写操作；所有 DomainEventHandler 必须 `await` 完成，禁止脱离事务的异步数据库任务。
4. 对确认整笔事务已回滚的 SQLite/Prisma 并发冲突，才允许有限安全重试；重试必须重新加载聚合、重新产生 DomainEvent、重新构建快照。**提交结果不确定的网络超时不自动重试写命令**。
5. Prisma 事务外读取可使用单独的查询 Session 接口；**事件应用的 Repository.apply() 必须 `requireTransaction()`**，不可静默退回 root PrismaClient 自动提交。
6. 客户端本地 SQLite 实现相同 TransactionRunner 语义；具体 sqlite 驱动是否支持跨异步调用链的事务句柄，需要按 UniApp 运行平台适配，不将 Node `AsyncLocalStorage` 直接移植进客户端。

---

## 7. 授权与调用上下文（M07、M08）

多人模式使用 **透明 `HostOnlyDecorator<TRequest,TResponse>`**；对外仍是普通 `UseCase.execute(request)`，不在每个 Request 中加入 `hostId`、`roomId`、`actorId` 作为装饰器专用参数。

服务端 HTTP Adapter 在进入 UseCase 前建立独立的 `HostContext`（Node ALS）：

```typescript
export interface HostContext {
  readonly roomId: string;
  readonly actorId: string;
}
export interface HostContextReader {
  get(): HostContext;
}
```

通过 Collaboration 的公开 `GetRoomAccessUseCase` 查询当前房主及成员资格；`RoomHostReader` 由服务端 Infrastructure 适配到此公开 Port.In，不依赖 Collaboration Core。Decorator 在共享事务内校验当前房主，失败抛 `AuthorizationError`。

```typescript
export class HostOnlyDecorator<
  TRequest extends UseCase.Request,
  TResponse extends UseCase.Response
> implements UseCase<TRequest, TResponse> {
  constructor(
    private readonly inner: UseCase<TRequest, TResponse>,
    private readonly hostContext: HostContextReader,
    private readonly roomHostReader: RoomHostReader,
    private readonly transactions: TransactionRunner
  ) {}

  execute(request: TRequest): Promise<TResponse> {
    return this.transactions.run(async () => {
      const { roomId, actorId } = this.hostContext.get();
      const hostId = await this.roomHostReader.getHostId(roomId);
      if (hostId !== actorId) throw new AuthorizationError();
      return this.inner.execute(request);
    });
  }
}
```

**注意**：校验当前房主不等于允许任意 `consumptionId`/`activityId`。Coordination 仍需在同一事务内证明 Request 操作的对象确实关联当前房间。房主转让、退房与提交等竞态依据服务端事务内实际生效顺序判定。普通编辑命令也需要“当前在线成员”的权限检查，但不必都使用 HostOnlyDecorator。

匿名 UUIDv7 可被伪造，不能当作安全认证。该风险由当前项目轻量匿名协作定位接受；未来若要求强权限安全需单独升级凭据机制。

---

## 8. Repository.apply、事件产生式聚合与版本（M13A）

### 8.1 精确成功事件与失败事件

```typescript
export class RestaurantProductDeleted extends DomainEvent {
  constructor(
    public readonly restaurantId: string,
    public readonly productId: string,
    public readonly expectedVersion: number
  ) { super(); }
}

export class ProductDeletionRejected extends DomainEvent {
  constructor(public readonly reason: string) { super(); }
}
```

```typescript
// Restaurant 聚合方法不修改自身状态
public deleteProduct(productId: string):
  RestaurantProductDeleted | ProductDeletionRejected {
  if (!this.hasProduct(productId))
    return new ProductDeletionRejected("PRODUCT_NOT_FOUND");
  return new RestaurantProductDeleted(this.id, productId, this.version);
}
```

Application：

```typescript
const restaurant = await repository.findById(request.restaurantId);
const event = restaurant.deleteProduct(request.productId);
if (event instanceof ProductDeletionRejected)
  throw new BusinessRuleError(event.reason);
const updatedRestaurant = await repository.apply(event);
return new DeleteProductUseCase.Response(updatedRestaurant.version);
```

### 8.2 Repository.apply 应用步骤

1. `requireTransaction()` 确认活动事务存在。
2. 基于 `expectedVersion` **原子**检查聚合根版本，同时将其增加一次；版本不符合抛 `ConcurrencyConflictError`。
3. 根据**精确事件类型**修改相应持久化数据。修改行数异常时抛持久化不变量错误，整笔事务回滚。
4. 向 `InvalidationCollectorPort` 追加当前聚合的 DataInvalidationEvent。
5. **立即** `await DomainEventBus.publish(event)`；所有订阅者此时读取的是当前事务已修改、未提交的状态。Handler 可以调用其他 UseCase 并复用当前事务。
6. Handler 全部完成后，通过 Repository Mapper + `reconstitute()` 从同一事务读取最新完整聚合并返回。

```typescript
async apply(event: RestaurantProductDeleted): Promise<Restaurant> {
  const tx = this.session.requireTransaction();
  const updated = await tx.restaurant.updateMany({
    where: { id: event.restaurantId, version: event.expectedVersion },
    data: { version: { increment: 1 } }
  });
  if (updated.count !== 1) throw new ConcurrencyConflictError();

  const removed = await tx.product.deleteMany({
    where: { id: event.productId, restaurantId: event.restaurantId }
  });
  if (removed.count !== 1) throw new PersistenceInvariantError();

  this.invalidations.add(new RestaurantInvalidated(
    event.restaurantId, event.expectedVersion + 1, this.target
  ));
  await this.domainEvents.publish(event);
  return this.findById(event.restaurantId);
}
```

此实现的 `findById()` 必须使用当前事务查询并通过 Mapper 重建，不得另用 root PrismaClient。Mapper 负责数据库结构 ↔ Domain 快照的映射；Domain 不依赖 ORM。

### 8.3 嵌套领域事件与同一聚合

若事件 A 把 R1 从 v5 改为 v6，Handler 产生事件 B 又把 R1 从 v6 改为 v7，则**外层 apply(A) 在 Handler 完成后重建，返回 v7**。两个应用操作各自基于最新版本产生事件；不要重复使用旧事件，也不要原地改 `expectedVersion`。

一个完整业务变化可设计为一个携带全部受影响商品 ID 的成功事件，例如 `RestaurantProductsDeleted`，通常只导致该聚合版本增加一次。暂不设计批量 `applyAll()`、部分重建、额外聚合缓存；多个独立变化需要按最新聚合逐次应用。

任何 Handler 抛异常都会让外层 UseCase 失败、整个 SQLite 事务回滚、失效通知不发布。不可逆的网络调用/文件写入不能在此阶段混入强一致性 Handler。

---
## 9. 目录查询、价格变化与商品删除（M10B、M11B）

### 9.1 当前消费结果的查询分工

| UseCase | 所在包 | 输出与职责 |
|---|---|---|
| `GetConsumptionForPricingUseCase` | accounting-contracts | 消费聚合 ID/版本、餐厅 ID、全部 Round、商品 ID 与数量 |
| `GetRestaurantPriceSnapshotUseCase` | catalog-contracts | 同一目录版本的餐厅名称、商品 ID/名称/有效单价、币种、版本 |
| `CalculateConsumptionResultUseCase` | accounting-contracts | Accounting Domain Calculator 的纯计算入口；以自己定义的 DTO 接收消费/价格，不引用 Catalog 类型 |
| `GetDiningResultUseCase` | coordination-contracts | 编排上述查询与计算，向客户端输出计算结果及 Consumption/Restaurant 双版本 |

当前结果 Query 必须保留 Round 维度，不再把所有 Item 无差别 `flatMap` 后丢失轮次归属。整个查询在同一读取事务中进行；一致的价格**读取视图**不等于需要为每次查询持久化完整 CatalogSnapshot。

```typescript
export interface GetDiningResultUseCase extends UseCase<
  GetDiningResultUseCase.Request,
  GetDiningResultUseCase.Response
> {}

export namespace GetDiningResultUseCase {
  export class Request extends UseCase.Request {
    constructor(
      public readonly consumptionId: string,
      public readonly restaurantId: string
    ) { super(); }
  }

  export class Response extends UseCase.Response {
    constructor(
      public readonly consumptionVersion: number,
      public readonly restaurantVersion: number,
      public readonly result: DiningResultDto
    ) { super(); }
  }
}
```

Request 的非空字符串校验按第 4 节的统一规则实现。`DiningResultDto` 是序列化后的展示结果结构，不直接暴露领域 `DiningResult` 对象。

价格变化只提升 Restaurant 聚合版本并发布 `RestaurantInvalidated`；**不修改 RestaurantConsumption.version**。Pinia 因目录变化重新查询，结果随新价格改变，包括已经提交的 Round。

### 9.2 商品删除 M11B：允许传播窗口，完成前必须对账

最终采用的区别：**DomainEvent 在事务内强一致、目录→消费的批量清理允许异步最终一致。** 不要混淆这两层。

流程：

1. Catalog Domain 产生 `RestaurantProductDeleted`（批量或删除分类可携带所有已删除商品 ID）。
2. Catalog Repository.apply() 修改目录、版本 +1、收集 RestaurantInvalidated，**立即** `await DomainEventBus.publish(event)`。
3. 同步 DomainEventHandler **在同一个数据库事务内**保存“待清理商品/目标目录版本/处理状态”等持久化**业务同步状态**；不立即扫描并修改全部 Consumption。
4. Catalog 事务 Commit，之后发布 RestaurantInvalidated。
5. 独立轻量处理器扫描待清理状态，逐个/逐批查找受影响的进行中 Consumption，调用公开 `ReconcileCatalogDeletionUseCase`；每个消费聚合在独立事务中应用成功领域事件、发布 DomainEvent，Commit 后发送 ConsumptionInvalidated。
6. 全部受影响 Consumption 修复、重新检查无引用后，标记待清理状态完成；中途失败可重试/应用恢复后继续。

这里的持久化“待清理状态”**不是 IntegrationEvent，也不存储待重放的 DomainEvent 对象**。无需新增第三种事件、Integration Outbox、RabbitMQ 或 Kafka。可将其实现为 SQLite 普通任务状态表，配合应用/服务端启动及周期性扫描。服务端多工作者时应提供领取状态或单进程串行调度，避免并发重复处理。

```typescript
export class RestaurantProductDeletedHandler
  implements DomainEventBus.Handler<RestaurantProductDeleted> {
  constructor(private readonly pending: PendingCatalogCleanupWriter) {}

  async handle(event: RestaurantProductDeleted): Promise<void> {
    await this.pending.record({
      restaurantId: event.restaurantId,
      productIds: [event.productId],
      catalogVersion: event.expectedVersion + 1
    }); // 同事务普通持久化状态，不是异步 publish DomainEvent
  }
}
```

**清理 Domain 规则**：对所有受影响的进行中消费聚合移除失效商品；已提交 Round 因删除变空则删 Round，未提交 Round 变空则保留，展示编号重排、稳定 Round ID 不变；已完成活动绝不被回写。重复清理已不含目标商品时为 NoChange，不提升版本、不发布失效通知。此种“业务清理幂等”并不是被取消的“网络重复请求去重”。

### 9.3 清理未完成时的结果语义

- 进行中 Query 若发现 Consumption 引用当前 Catalog 中不存在的商品，抛 `CatalogReconciliationPendingError`；**禁止把缺失价格按零计算**。
- 完成用餐前，Coordination 在事务内核对该餐厅的待清理状态和所有消费商品是否有效。若未对账完成，拒绝形成正式结果；后续清理完成后再执行结束命令。
- 删除餐厅与删除商品不同：删除餐厅应使进行中活动的相应候选数据失效，并禁止将它选为最终餐厅；需要复用同样的可靠修复/校验原则。
- 私人餐厅完整目录同步到房间副本时，应识别旧/新版本真实的商品差异，并在服务端提交房间副本更新后触发本地服务端清理；不发送 DomainEvent 对象跨网络。
- 对于跨设备原件与房间副本，**不能保证一个跨设备原子事务**。通过目录版本与完整状态同步恢复，且只有有资格的原创建者能写入副本。

---

## 10. DiningResult 不可变模型与统一计算（M14、M15、M16、M20）

### 10.1 不保存完整 CatalogSnapshot

`DiningResult` 是 Accounting Domain 的**不可变值对象**，属于用餐结束时的 `DiningActivity`；**不增加 DiningFinalization 聚合根**。它只冻结本次被选中餐厅的消费必要数据：餐厅 ID/名称、总门票金额、完成时成员名单、所有有效轮次/菜品名称/数量/单价/小计、币种、总金额、完成时间等。

用餐中保存的小票也采用相同的**最小完备结果数据**原则，但它来自当前用户查看的候选餐厅、可以含非空未提交轮次；它不使 DiningActivity 进入 ENDED 状态。

```typescript
export class DiningResult {
  private constructor(
    public readonly restaurantId: string,
    public readonly restaurantName: string,
    public readonly ticketPriceMinor: number,
    public readonly diners: readonly DiningResult.Diner[],
    public readonly rounds: readonly DiningResult.Round[],
    public readonly currency: string,
    public readonly foodTotalMinor: number,
    public readonly netValueMinor: number,
    public readonly completedAt: string
  ) {}

  static create(input: DiningResult.Input): DiningResult {
    // 校验 ticketPriceMinor > 0，金额/数量/币种/轮次，
    // 防御性深拷贝并冻结嵌套数据；不接受不可信的小计作为权威数值。
    return createValidatedImmutableDiningResult(input);
  }
}

export namespace DiningResult {
  export interface Diner {
    readonly memberId: string;
    readonly displayName: string;
  }
  export interface Item {
    readonly productId: string;
    readonly productName: string;
    readonly quantity: number;
    readonly unitPriceMinor: number;
    readonly subtotalMinor: number;
  }
  export interface Round {
    readonly roundId: string;
    readonly sequence: number;
    readonly status: "ACTIVE" | "SUBMITTED";
    readonly items: readonly Item[];
  }
  // Input 的字段与以上最小完备结果对应；在实际文件内定义。
}
```

上述 `createValidatedImmutableDiningResult` 为设计占位函数，正式实现采用构造/静态工厂在 Domain 内完成校验与不可变保护。时间统一 UTC ISO 字符串；钱按最小货币单位安全整数或既定 Money VO 运算，禁止浮点直接累加。

**总门票金额只有一个**：`ticketPriceMinor > 0`。`Diner` 不包含门票字段。无论房间多少人，计算均为：

```text
foodTotalMinor = Σ(每轮每菜品 unitPriceMinor × quantity)
netValueMinor  = foodTotalMinor − ticketPriceMinor
paybackRatio   = foodTotalMinor / ticketPriceMinor   // 若需以百分比展示再乘 100
```

例如整房门票 30000 分，全部菜品估值 42000 分，盈利 12000 分，回本率 140%；**不乘成员人数**。零菜品可正常结束，收益为负门票总额。

### 10.2 CompletionCalculator 结构

`ConsumptionCalculator` 只依赖 Accounting Domain 自己的计算输入/值对象，使用外部已校验的价格/名称数据；**不主动调用 Catalog Query**。它保留轮次层次，不能用全局 `productId` 合并不同 Round 的重复商品。各商品缺失当前有效价格即拒绝，不能默认为零。

```typescript
export interface CalculationInput {
  readonly restaurantId: string;
  readonly restaurantName: string;
  readonly ticketPriceMinor: number;
  readonly currency: string;
  readonly diners: readonly DiningResult.Diner[];
  readonly rounds: readonly {
    roundId: string;
    sequence: number;
    status: "ACTIVE" | "SUBMITTED";
    items: readonly { productId: string; quantity: number }[];
  }[];
  readonly products: readonly {
    productId: string;
    name: string;
    priceMinor: number;
  }[];
  readonly completedAt: string;
}
```

计算结果用于最终完成时为 `DiningResult`；实时金额和中途小票也复用相同计算规则，但**中途快照不能伪造完成时间或结束状态**：建议在 Application 的中途快照 DTO 使用 `capturedAt`，只有最终完成结果才存在 `completedAt`。领域金额计算可复用，最终 DTO 与中途快照 DTO 的生命周期需要明确区分。

### 10.3 用餐人名单

最终结果的 `diners` 仅来自 **完成时仍属于房间且服务端确认在线的成员**，固定姓名/显示名及匿名 ID；已退出者不计入。谁点了添加按钮不意味着谁吃了该菜，`ConsumptionItem` 不含成员归属。`diners` **不参与票价计算**。

单人结果可以使用本地用户的显示信息构造同型 `Diner`，不需要在 Accounting 引入 `RoomMember` 或 `Host` 的类型。已完成房间的结果领取资格集合与该时点成员名单由 Collaboration 决定并在事务内冻结；若之后成员变化，不重写 DiningResult。

---

## 11. 用餐结束、自动提交与结果冻结（M09、M14–M17）

### 11.1 结束流程顺序

一次完成命令必须明确传入 `finalRestaurantId`，单人和多人一致。多人由透明 HostOnlyDecorator 做房主检查，Coordination 再检查 Room/Activity/Consumption/Restaurant 的真实关联。

推荐在**同一事务**中依次执行：

1. 读取并校验当前 Activity = ACTIVE，Room = ACTIVE（多人）、选择的最终餐厅仍有效、门票总金额大于零；检查当前操作权和目标房间所有权。
2. 根据 M11B 检查选定餐厅仍有无待清理商品/删除餐厅记录及失效商品引用。未完成清理则抛业务同步异常，不冻结结果。
3. 读取最终餐厅的 `RestaurantConsumption` 与同一有效版本 Catalog 的完整价格/商品名称视图；读取服务端确认在线且在房间中的合格成员。
4. **将选中餐厅非空 ACTIVE Round 视为 SUBMITTED**，不新建下一轮；空 ACTIVE Round 不放入最终结果。必须将轮次状态变更通过 RestaurantConsumption 的领域成功事件与 Repository.apply 持久化，不能仅在结果 DTO 中伪装为已提交。
5. 调用 Accounting `ConsumptionCalculator`，以最终状态 Round、统一票价和当前目录版本构建只包含选定餐厅消费明细的不可变 `DiningResult`。
6. `DiningActivity.end(result)` 产生 `DiningEnded`；Repository.apply 原子更新 Activity 状态、最终餐厅标识与 result，并在事务内立即发布 DomainEvent。
7. 多人同时通过 `EndRoomUseCase` 固定服务端合格成员集合并将房间设为只读 ENDED；校验 Room.version，避免成员退出、房主转让与结束竞态产生不一致的名单。
8. 全部成功 Commit；只在 Commit 后发布相关 DataInvalidationEvent。客户端之后独立保存自己的历史和小票，不能把客户端保存成功作为服务端结束事务的一部分。

**必须处理零菜品情形**：没有非空 Round 时最终 `rounds=[]`、`foodTotalMinor=0`、`netValueMinor=-ticketPriceMinor`，可成功结束；此时不能因为“无法提交空轮次”而拒绝完成。第 4 步的系统自动提交不是普通的 `SubmitRoundUseCase`（后者要求非空并产生新一轮），可定义独立 `FinalizeConsumptionForEndingUseCase`，由 RestaurantConsumption Domain 产生精确的完成清理/提交事件。

### 11.2 完成命令分工

```text
EndMultiplayerDiningUseCase              [Coordination, Transactional]
  ├── HostOnlyDecorator                   [外围，同接口 execute(request)]
  ├── GetRoomAccess/GetRoomMembers         [Collaboration Contracts]
  ├── GetActivity/GetConsumption          [Accounting Contracts]
  ├── GetRestaurantPriceSnapshot          [Catalog Contracts]
  ├── EnsureCatalogReconciled             [Coordination/Accounting 查询]
  ├── FinalizeConsumptionForEnding        [Accounting Command]
  ├── EndDiningUseCase                     [Accounting Command, 创建 DiningResult]
  └── EndRoomUseCase                       [Collaboration Command]
```

`EndDiningUseCase` 的可信输入由 Coordination 从经过服务器验证的查询数据构建。HTTP 只暴露终端协调 UseCase，不允许客户端直接提交任意商品价格与最终金额以绕过 Catalog 校验。单人结束则由本地 Coordination 调用同一 Accounting Calculator/Interactor。

### 11.3 已结束与并发

`DiningActivity.end(result)` 对已结束状态返回 `DiningEndRejected("ALREADY_ENDED")`，Application 转成 BusinessRuleError。网络超时导致首次结束实际已经提交，再次发结束 Command **仍然抛异常**；客户端可独立查询 `GetCompletedDiningResultUseCase` 恢复状态。

两个并发完成请求只能有一个实际成功：以 Activity/Room 版本冲突、事务隔离及终态校验判定。安全回滚重试重新读取发现已经结束后应返回 `ALREADY_ENDED`，但**不可把所有锁冲突笼统归类为已结束**。放弃与完成先成功的终态操作胜出；另一个拒绝。

### 11.4 完成后的写入封锁

Activity 和 Consumption 是两个独立聚合，因此**仅检查 Activity.end() 不足以阻止结束后继续新增商品**。所有编辑/清空/提交等入口必须在共享事务内验证关联 Activity 仍为 ACTIVE；Room 也必须处于允许操作的状态。完成后只提供完成结果 Query，不允许通过旧消费 Command 改写已完成快照。

---
## 12. 个人小票、正式历史与房间回收（M15、M18、M21、M23）

### 12.1 两种结果取得方式

| 场景 | 数据来源 | 状态影响 | 本地保存 |
|---|---|---|---|
| 用餐进行中保存小票 | 当前成员查看的候选餐厅的 Consumption + 当前有效 Catalog | **不结束活动**；保留 ACTIVE Round | 当前用户自己的 SavedReceipt，后存覆盖前存 |
| 用餐结束后保存小票 | `DiningActivity.result` 已固定的 DiningResult | 只读，不重新按最新目录计算 | 合格成员自己的 SavedReceipt，覆盖其先前保存的小票 |
| 用餐结束后保存历史 | 已固定 DiningResult | 不修改服务端业务状态 | 本地历史可多条；按稳定活动 ID 去重 |
| 主动放弃 | 无正式完成结果 | 房间进入 ABANDONED | 不新增正式历史；已有中途小票可保留 |

### 12.2 SavedReceipt 数据

```typescript
export class SavedReceipt {
  constructor(
    public readonly receiptId: string,
    public readonly ownerId: string,
    public readonly source: "LOCAL" | "REMOTE",
    public readonly activityId: string,
    public readonly roomId: string | null,
    public readonly snapshot: ReceiptSnapshot,
    public readonly savedAt: string
  ) {}
}
```

`ReceiptSnapshot` 只包含可独立生成小票的必要消费数据；与 `DiningResult` 的共同明细结构应复用，不把完成专有 `completedAt` 强加给中途保存。`ownerId` 取本地匿名身份上下文，不允许用户任意指定他人 ID；它表示**谁保存**而不是**谁吃了菜品**。历史模型和小票可复用快照值对象，但二者的保留规则不同。

客户端 SQLite 为每个用户保留一份当前小票记录，后存覆盖；正式历史按 `(source, activityId)` 去重，可保存多个不同活动、分别删除。保存必须在单个本地 SQLite 事务中写完快照和元数据，防止半写入。若同一活动再次领取历史，则更新或忽略已有历史项，不重复添加。

### 12.3 已完成房间资格与回收

- 完成时由服务端在同一事务冻结合格成员集合：**仍属于房间且被服务端确认在线的成员**。完成前离开的成员不具备补存资格。
- 房间进入 ENDED 后只读；其合格成员可在房间还存在时重新加入、查询同一完成结果、补存/覆盖本地小票及历史。放弃房间不能重新加入。
- 无在线成员时设置 `EmptySince`；经过 **10 分钟**允许回收，重入与回收在服务端的事务/版本约束下竞态判定。不能仅凭调度器触发时间直接宣称销毁先发生。
- 房间回收删除服务端的临时房间、活动和私人副本数据，不触碰各客户端已保存的个人小票和历史；没及时保存的成员无法在房间销毁后再向房间获取结果。
- 小票生成与房间放弃竞争：**快照生成已在服务端先成功**，之后的本地保存可完成；若放弃先实际生效，则拒绝生成新的服务端快照。

### 12.4 进行中与完成后核算的差异

进行中：最新 Catalog 价格的同一版本 + 当前所有有效 Round（ACTIVE/SUBMITTED 都计入）。价格变化会刷新当前结果，但**不会追溯修改已保存的小票**。

完成后：只读取固定 `DiningResult`，不能再次查询当前 Catalog 重新估价。完成过程中非空 ACTIVE Round 自动转换为 SUBMITTED，最终结果忽略空 ACTIVE Round；正常完成即使没有食物也合法。

---

## 13. UniApp 前端：Port.In 路由、Pinia 与 TanStack Query（M10B）

### 13.1 LOCAL / REMOTE 选择

```typescript
export type DiningTarget =
  | { readonly kind: "LOCAL"; readonly scopeId: string }
  | { readonly kind: "REMOTE"; readonly scopeId: string };
```

`DiningTarget` 是客户端 Adapter/应用调用上下文，不进入 Accounting Domain。客户端的桥接 Port.In Adapter 按目标选择：

```text
UniApp Page → Pinia Setup Store → DiningResultBridge
                                  ├── LOCAL  → 本地同一 Interactor → SQLite Port.Out
                                  └── REMOTE → HTTP Port.In Adapter → 服务端同一 Interactor → Prisma
```

单人本地活动与多人房间可同时存在；不同 scope 必须隔离 Query Key、EventBus 目标、Store 的展示状态。页面允许调用多个 Port.In/Store，不能把框架 Store 依赖塞进 BC Core。

### 13.2 Query Key 与缓存失效

```typescript
function diningResultKey(
  target: DiningTarget,
  consumptionId: string,
  restaurantId: string
) {
  return [
    "dining-result",
    target.kind,
    target.scopeId,
    consumptionId,
    restaurantId
  ] as const;
}
```

在 Pinia **Setup Store** 内创建或获取已注入的 QueryClient，使用 TanStack Query Core 的 `QueryObserver`、`subscribe()` 维护响应式 `shallowRef`、`loading`、`error`；Store 对 Page 仅公开展示数据和用户动作。业务 Command 不在成功后手动调用缓存刷新，统一等待提交后 DataInvalidationEvent。

```typescript
// Consumption 聚合失效：按 Query Key 前缀匹配
void queryClient.invalidateQueries({
  queryKey: ["dining-result", target.kind, target.scopeId, consumptionId]
});

// Restaurant 聚合失效：按末尾 restaurantId 匹配
void queryClient.invalidateQueries({
  predicate: query => {
    const k = query.queryKey;
    return k[0] === "dining-result"
      && k[1] === target.kind
      && k[2] === target.scopeId
      && k[4] === restaurantId;
  }
});
```

Query Observer 只在 Store 管理的查询活跃期间订阅，切换当前消费、Store 销毁时取消旧订阅，避免重复观察和内存泄漏。失效通知以聚合根为粒度，不创建 Round/Item 级失效事件。

### 13.3 WebSocket 与版本处理

服务端提交后通过 WebSocket Adapter 将 DataInvalidationEvent 广播到目标房间；前端收到 JSON 后重建面向对象事件实例，再由相同 DataInvalidationEventBus 交给 Store。**不通过 WebSocket 发送 DomainEvent 来让客户端执行权威业务状态修改**。

客户端保存已知的聚合版本和已收到的最高失效版本，防止网络乱序响应被误当作最新；断线重连后依赖 Query/版本对账恢复。由于通知是提交后的尽力而为传播，不能把“没收到通知”等同于“数据没有变化”。

---

## 14. 依赖注入与 Composition Root（M01、M07、M12）

服务端使用 Awilix Singleton 注册无状态 Interactor、Repository Adapter、EventBus、TransactionRunner 和 Handler；其请求/事务状态不得存在实例的可变成员字段中，改由 AsyncLocalStorage 提供。

```typescript
container.register({
  domainEventBus: asClass(EventEmitter3DomainEventBus).singleton(),
  invalidationBus: asClass(EventEmitter3DataInvalidationEventBus).singleton(),
  transactionRunner: asClass(PrismaTransactionRunner).singleton(),
  restaurantRepository: asClass(PrismaRestaurantRepository).singleton(),
  catalogDeletionHandler: asClass(RestaurantProductDeletedHandler).singleton()
});

// Composition Root 仅运行一次
const bus = container.resolve<DomainEventBus>("domainEventBus");
const handler = container.resolve<RestaurantProductDeletedHandler>(
  "catalogDeletionHandler"
);
bus.subscribe(RestaurantProductDeleted, handler);
```

示例省略 Awilix 注入参数名称、`PrismaSession` 和失效收集器接口到同一 Runner 的别名/工厂映射。实际应在启动时显式验证依赖可解析，处理器注册不遗漏；服务端和 UniApp 的 Composition Root 选择不同基础设施实现，核心 UseCase 不改变。

本地仅注册适用于本地运行的 Handler、SQLite Repository、SQLiteTransactionRunner；服务端注册 Prisma 实现、WebSocket 广播 Handler、房间/权限 Adapter 以及待清理业务状态处理器。客户端平台若缺少通用 EventEmitter3 运行支持，先验证 UniApp 打包适配，不应为普通用例引入对 Node 的依赖。

---

## 15. SQLite 持久化模型与恢复（不提前性能优化）

### 15.1 服务端参考存储边界

可使用结构化关键列 + 聚合内部 JSON（既定选择），例如：

| 存储概念 | 关键字段建议 | 备注 |
|---|---|---|
| DiningActivity | `id,status,ticketPriceMinor,version,finalRestaurantId,resultJson` | 完成事件同事务固定结果 |
| RestaurantConsumption | `id,activityId,restaurantId,version,roundsJson` | 轮次是内部实体，稳定 ID 不随序号变化 |
| Restaurant | `id,type,version,originalRestaurantId,catalogJson` | PRIVATE/ROOM_COPY 映射和来源版本必要时独立列 |
| DiningRoom | `id,activityId,status,version,creatorId,hostId,emptySince,membersJson,eligibleMemberIdsJson` | 完成/放弃/加入/退出均按版本与权限校验 |
| PendingCatalogCleanup | `id,restaurantId,productIdsJson,catalogVersion,status,progress` | **普通待处理业务状态**，非第三种事件/事件溯源表 |

以上只是建议的存储形态，不意味着全部列名已构成数据库迁移规范；具体 Prisma Schema 与客户端 SQLite 适配可在实施时根据数据访问需求细化。关键业务不变量由 Domain 与 Repository 共同保证，不应完全依赖 JSON 字段的隐含结构。

### 15.2 本地持久化

本地单人正在进行的 DiningActivity 与 Consumption 自动持久化；关闭/崩溃/重启后可继续，最多一个本地 ACTIVE 单人活动。私人餐厅原件不必上传服务器。个人 SavedReceipt 和历史只存在本地，丢失本地存储就无恢复承诺。

本地 SQL 事务必须涵盖 Repository.apply 事件应用和同步 DomainEventHandler 的数据库修改；Commit 后在本机发布 DataInvalidationEvent。若本地商品删除的异步清理尚未完成，可在打开应用或恢复前台时从普通待清理状态继续处理，而不是假设应用被系统终止时仍能后台运行。

### 15.3 数据与权限保留

匿名身份丢失则生成新的匿名身份，不恢复旧成员/结果资格。服务端房间只保留存续期共享数据；本地历史与小票可各自删除，不触发远程房间改动。多人房间仅支持合格成员在房间未销毁前补存；服务端不可承诺云端长期保存个人历史。

---

## 16. 端到端测试与验收清单

建议以真实 SQLite/Prisma 集成测试为主验证事务、版本和多 Context 行为；单独 Domain 单测验证业务决策。不把只使用 Mock Repository 的测试当作事务正确性充分证明。

### 16.1 Domain / Repository

| 测试 | 必须观察的结果 |
|---|---|
| Domain 方法调用 | 聚合原状态不变，产生精确成功/失败事件 |
| 失败事件 | Application 抛业务异常，不调用 Repository.apply |
| 成功 apply | 版本检查正确、按事件更新数据库、立即 await 订阅者、返回重建最新聚合 |
| apply 无活动事务 | 明确拒绝，不进行自动提交 |
| 两客户端同聚合 v5 并发修改 | 最多一个按旧版本成功，另一发生冲突或在安全重试后重新决策 |
| Handler 再次修改同一聚合 | 外层 apply 返回嵌套修改后的最新版本 |
| Handler 抛异常 | 原始修改、联动修改、待清理状态全部回滚 |
| 回滚事务 | 不发布任何 DataInvalidationEvent |
| 一个事务多次改同聚合 | 只发送最终最高版本的聚合根失效 |

### 16.2 核算与轮次

| 测试 | 必须观察的结果 |
|---|---|
| 空 ACTIVE Round 手动提交 | 抛业务异常 |
| 非空 ACTIVE Round 手动提交 | 原轮次锁定、自动创建下一空 ACTIVE Round，原子生效 |
| 已提交/未提交同时存在 | 均计入进行中实时核算及中途小票 |
| 用户清空未提交 Round | 移除商品、保留 Round |
| 用户编辑已提交 Round | 抛业务异常 |
| 删除商品导致已提交 Round 变空 | 自动删该 Round、编号连续且 Round ID 不变 |
| 删除商品导致未提交 Round 变空 | 保留空 ACTIVE Round |
| 完成时最后非空 ACTIVE Round | 自动视为提交，计入最终结果，**不创建下一轮** |
| 完成时只有空 ACTIVE Round | 可正常结束，food=0、net=-ticketPriceMinor |
| 商品改价 | 不变更 Consumption.version，但当前核算结果刷新 |
| 当前目录缺失曾消费商品 | 不按零元计价，不生成错误最终结果 |
| 票价为零或负数 | 业务拒绝；多人非房主改票价拒绝 |

### 16.3 房间、小票、请求行为

| 测试 | 必须观察的结果 |
|---|---|
| 房主退出、离线或主动转让 | 在线成员房主唯一，按规则交接/转让 |
| 完成与退出并发 | 资格与结果成员名单符合服务端实际确认在线状态 |
| 完成时成员已退出 | 不计入 diners，不具有重新进入完成房间的资格 |
| 非房主尝试结束 | 权限异常，数据不变 |
| 重复结束 | `ALREADY_ENDED` 异常，不返回原成功 Response |
| 两个重复添加请求均成功 | 数量累计两次，无请求 ID 去重 |
| 中途保存小票 | 包括 ACTIVE/SUBMITTED 有效轮次，不改变活动状态 |
| 同用户重复保存当前小票 | 后存覆盖前存，不改其他成员小票 |
| 同一完成活动重复存历史 | 按稳定 Activity ID 去重，不增加两条历史 |
| 房间已完成 | 仅完成时合格成员可在销毁前重入领取固定结果 |
| 房间空置不足 10 分钟 | 不得按超时销毁 |
| 10 分钟后回收与重入竞争 | 根据实际成功事务顺序决定 |
| 房间销毁 | 本地已保存小票与历史依然存在 |
| DomainEvent 处理器写入待清理状态后崩溃 | 与原目录删除同事务回滚；若已提交则任务可恢复 |
| 清理中途失败或重复执行 | 可以恢复；已清理商品 NoChange，不额外增加版本 |
| 网络响应超时后重复发送写命令 | 不实施去重；客户端不应无条件自动重试 |

---

## 17. 决策索引与旧设计覆盖

### 17.1 M01–M23 最终归纳

| 阶段 | 本文采用的最终结论 |
|---|---|
| M01 | Contracts/Core 物理包边界，Coordination Core 依赖其他 BC Contracts |
| M02–M03 | 每 UseCase 独立文件；接口与同名 namespace；Request 显式构造参数、直接校验、Response 只返回成功数据 |
| M04 | 失败事件转异常，不通过 Response 返回 REJECTED |
| M05–M06 | 单人/多人共享核心 Interactor，Host 权限在外围校验，身份不进入 Accounting Domain |
| M07 | 透明 HostOnlyDecorator，HostContextReader 来自服务端上下文，不更改 execute(request) |
| M08 | 共享 SQLite 事务与 PrismaSession，异常整体回滚；并发安全重试不重复重放已提交写入 |
| M09 | Application Coordination 无 Domain；跨 BC 调用多个公开 Port.In；TransactionalUseCase，不增加 AtomicWorkflowDecorator |
| M10B | GetDiningResult 由 Coordination 编排 Consumption/Price Query 和 Accounting Calculator，Pinia 订阅消费/目录失效 |
| M11B | Catalog 商品删除后 Accounting 最终一致清理；DomainEvent 同步记录持久待清理状态，之后独立清理 |
| M12B | EventEmitter3 封装两类 Bus；DomainEvent 事务内立即 await，DataInvalidationEvent 提交后发布 |
| M13A | Repository.apply 负责版本检查、持久化、立即 DomainEvent 分发和最后聚合重建 |
| M14 | 完成时只保存不可变 DiningResult，本次消费最小完备信息；不保存全量 CatalogSnapshot |
| M15A | 多人统一核算整房消费，每名合格成员本地独立保存同一完成结果 |
| M16 | 完成结果用餐人只含完成时仍在房间且服务端确认在线的成员 |
| M17 | 已结束再次执行结束 Command 抛业务异常，已完成结果通过 Query 获取 |
| M18 | 空房间保留 10 分钟后可回收；完成资格与重入按战略基线 |
| M19 | 非空未提交 Round 在完成时自动视为提交；空轮次忽略，不创建新轮次 |
| M20 | 门票是全活动总金额且 >0；多人仅当前房主在结束前修改 |
| M21 | 同一用户小票后存覆盖前存；正式历史可多条且按活动 ID 去重 |
| M22 | 不提供 HTTP 请求 ID 去重；分别成功的重复命令分别生效 |
| M23 | 无人在线 10 分钟回收竞争，以服务端实际业务生效顺序为准 |

### 17.2 被废止/修订的旧提案

| 旧提案或早期表述 | 现行替代规则 |
|---|---|
| 票价为成员个人单价、需要 `diners.length × ticketPrice` | 整房总票价，只保存一次，不乘人数；金额必须大于零 |
| 结束时存完整不可变 `CatalogSnapshot` | 只读一致目录版本，持久化最小完备 `DiningResult` |
| 没有消费不能结束 | **允许**零菜品正常结束 |
| 非空未提交轮次需手动提交才能结束 | 完成时自动视为提交，且不创建下一轮 |
| DomainEvent 存 TransactionScope 后统一分发 | **取消**；Repository.apply 中即时 publish + await |
| DomainEvent 在 Commit 后处理业务 | **取消**；DomainEvent 强一致处理器在 Commit 前 |
| 增加 IntegrationEvent / Integration Outbox | **取消**；仅 DomainEvent + DataInvalidationEvent，M11B 的持久化待清理业务状态不是事件 |
| 请求必须带幂等键并去重 | **取消**；不做请求级幂等 |
| 事件处理器直接发 WebSocket 消息 | **取消**；WebSocket 只发送 Commit 后的失效通知 |
| 个人消费商品按成员归属 | **不采用**；核算整房、个人只是小票保存者 |
| DiningFinalization 单独聚合 | **不采用**；结果作为 DiningActivity 内不可变值对象 |
| 提前优化大型聚合或局部 SQL 更新 | 暂缓到性能分析阶段 |

---

## 18. 实施交接与尚需验证的工程事项

业务规则决策已完成；下面是**工程验证事项**，不是重新打开业务选择题：

1. **客户端 SQLite 事务适配**：确认 UniApp 目标运行平台是否具备事务、异步调用传播、必要的本地存储 API；为不同端实现同一个 TransactionRunner 行为。
2. **Prisma 版本兼容**：按照当前项目实际 Prisma/SQLite 版本验证交互式事务、带版本条件更新和超时/锁冲突错误分类；示例 API 不是对未锁定版本的承诺。
3. **事务回滚与重试**：只在确知事务回滚时重试，重算业务事件；错误不可被吞掉后提交。对于提交结果不确定的远程请求避免自动重放写操作。
4. **M11B 可靠对账**：待清理业务状态的持久化、任务领取、分批恢复、已删除商品引用的查漏检查；服务端崩溃后仍可恢复，不声称内存事件分发即提供最终一致保障。
5. **目录有效版本跨设备传播**：公共/私人目录副本与远程消费之间保持版本来源可解释；跨设备本地→远程不是一个事务，在结果冻结前核实最终版本。
6. **完成权限与成员状态并发**：在同一个数据库事务里验证 Room 版本、成员在线资格、Activity 状态、Consumption/Catalog 有效性、总票价并执行状态转换。
7. **小票/历史导出能力**：渲染、分享或导出是 UI/Infrastructure 适配任务，不改变不可变消费快照语义。
8. **后续性能优化**：等模型与集成测试稳定，再评估巨型 JSON 聚合、Round 数量、读写锁争用、批量事件等实际瓶颈；不得为了存储方便随意改变业务聚合边界。

---

## 19. 验收标准

当且仅当下列条件得到真实实现与测试支持时，视为本战术设计落地：

- 单人和多人共享相同 Accounting Domain + 核心 Application 行为，且不使用单人虚拟房间。
- DomainEvent 即时、同步可等待、事务内执行；Repository.apply 能返回嵌套 Handler 修改后的最新聚合；回滚不发布 DataInvalidationEvent。
- Catalog 商品删除的最终一致性恢复可执行；过程中的实时结果和正式结果不会因缺失价格而失真。
- Room、成员资格、总门票、最终餐厅与 Round 状态在完成操作中一体判定，最终 DiningResult 不依赖后续 Catalog 查询且不会改写。
- 中途小票、完成历史、每人独立保存和 10 分钟房间回收符合战略基线。
- 不偷偷添加 HTTP 请求级去重或复杂性能优化，保留已确认的请求与错误语义。

**最终边界**：战略设计说明业务规则，战术设计说明边界和实现方式。二者共同作为后续编码、重构和验收依据。
