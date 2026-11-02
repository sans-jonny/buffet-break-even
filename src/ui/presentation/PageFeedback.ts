export namespace PageFeedback {
    export function report(error: unknown): void {
        const messages: Record<string, string> = {
            UNKNOWN_COMMIT_OUTCOME: '提交结果待确认，请先核对房间记录，勿重复加量',
            SYNC_PENDING: '已提交，正在恢复同步',
            HOST_REQUIRED: '此操作需要当前房主',
            ALREADY_ENDED: '用餐已经结束',
            EMPTY_ROUND: '空轮次不能提交',
            INSUFFICIENT_QUANTITY: '当前数量不足',
            RECOVERY_REQUIRED: '本地数据需要恢复，请保留数据并检查备份',
            DISCONNECTED: '房间连接断开，正在通过历史日志补齐',
            RESTAURANT_CATEGORY_EMPTY: '该分类暂无可用餐厅',
            RESTAURANT_NOT_IN_ACTIVITY: '该餐厅不属于本次用餐'
        }
        const message = error instanceof Error ? error.message : '操作失败，请重试'
        uni.showToast({title: messages[message] || message, icon: 'none'})
    }
}
