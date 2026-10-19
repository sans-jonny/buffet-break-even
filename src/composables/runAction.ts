/** 页面事件的统一错误出口；同时捕获同步用例和异步导航失败。 */
export async function runAction(action: () => unknown | Promise<unknown>): Promise<void> {
    try {
        await action()
    } catch (error) {
        uni.showToast({title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none'})
    }
}
