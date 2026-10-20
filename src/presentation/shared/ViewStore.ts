/** 展示快照的写入契约，由具体 Store 按结构实现，不依赖 Pinia。 */
export interface ViewStore<TView> {
    present(view: TView): void
}
