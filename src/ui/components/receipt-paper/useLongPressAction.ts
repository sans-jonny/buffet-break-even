import {compatibilityMouse} from '../interaction/compatibilityMouse'
import {getCurrentScope, onScopeDispose} from 'vue'

export function useLongPressAction(action: () => void, now = () => Date.now()) {
    type TouchEvent = { touches?: ArrayLike<{ clientX: number; clientY: number }> }
    let active = false, triggered = false
    let startedAt = 0
    let origin: { clientX: number; clientY: number } | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    function clearTimer() {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined
    }

    function cancel() {
        clearTimer();
        active = false;
        triggered = false;
        origin = undefined;
        compatibilityMouse.recordTouch(now())
    }

    function start(event?: TouchEvent) {
        cancel()
        if (event?.touches && event.touches.length !== 1) return
        active = true;
        startedAt = now();
        origin = event?.touches?.[0]
        timer = setTimeout(trigger, useLongPressAction.RECEIPT_LONG_PRESS_MS)
    }

    function trigger() {
        if (!active || triggered) return
        clearTimer()
        triggered = true
        compatibilityMouse.recordTouch(now())
        action()
    }

    function longPress() {
        if (now() - startedAt >= useLongPressAction.RECEIPT_LONG_PRESS_MS) trigger()
    }

    function move(event: TouchEvent) {
        const point = event.touches?.[0]
        if ((event.touches && event.touches.length !== 1) || (origin && point &&
            (Math.abs(point.clientX - origin.clientX) > 8 || Math.abs(point.clientY - origin.clientY) > 8))) cancel()
    }

    function end() {
        cancel()
    }

    if (getCurrentScope()) onScopeDispose(cancel)
    return {start, longPress, move, end, cancel}
}

export namespace useLongPressAction {
    export const RECEIPT_LONG_PRESS_MS = 500
}
