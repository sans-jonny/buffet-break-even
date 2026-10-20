export interface CollectionDeleter {
    /** 删除收藏；不存在时忽略，不影响用餐历史。 */
    delete(id: string): void
}
