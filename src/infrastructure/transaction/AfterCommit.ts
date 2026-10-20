/** 仅负责提交后发布；展示适配器无需知道数据库实现。 */
export type AfterCommit = (owner: string, publish: () => void) => void
