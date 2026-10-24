import {recordTouch} from './compatibilityMouse'
import {getCurrentScope, onScopeDispose} from 'vue'

export const RECEIPT_LONG_PRESS_MS = 500
type TouchEvent = {touches?: {clientX: number; clientY: number}[]}

/** 用独立计时器统一各平台长按阈值，不依赖系统默认的350ms。 */
export function useLongPressAction(action: () => void, now = () => Date.now()) {
    let active = false, triggered = false
    let startedAt = 0
    let origin: {clientX: number; clientY: number} | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    function clearTimer() {if (timer !== undefined) clearTimeout(timer); timer = undefined}
    function cancel() {clearTimer();active = false;triggered = false;origin = undefined;recordTouch(now())}
    function start(event?: TouchEvent) {
        cancel()
        if (event?.touches && event.touches.length !== 1) return
        active = true;startedAt = now();origin = event?.touches?.[0]
        timer = setTimeout(trigger, RECEIPT_LONG_PRESS_MS)
    }
    function trigger() {
        if (!active || triggered) return
        clearTimer()
        triggered = true
        recordTouch(now())
        action()
    }
    function longPress() {if (now() - startedAt >= RECEIPT_LONG_PRESS_MS) trigger()}
    function move(event: TouchEvent) {
        const point = event.touches?.[0]
        if ((event.touches && event.touches.length !== 1) || (origin && point &&
            (Math.abs(point.clientX - origin.clientX) > 8 || Math.abs(point.clientY - origin.clientY) > 8))) cancel()
    }
    function end() {cancel()}
    if (getCurrentScope()) onScopeDispose(cancel)
    return {start,longPress,move,end,cancel}
}
