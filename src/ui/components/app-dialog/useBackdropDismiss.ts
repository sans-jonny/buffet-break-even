import {isCompatibilityMouse, recordTouch} from '../interaction/compatibilityMouse'

type GestureEvent = {
    type: string
    button?: number
    sourceCapabilities?: { firesTouchEvents?: boolean }
    touches?: { clientX: number; clientY: number }[]
    changedTouches?: { clientX: number; clientY: number }[]
}

/** Bind only to the separate backdrop node, never the dialog or its controls. */
export function useBackdropDismiss(close: () => void, now = () => Date.now()) {
    let pressed: 'touch' | 'mouse' | null = null
    let origin: { clientX: number; clientY: number } | undefined

    function cancel() {
        pressed = null;
        origin = undefined
    }

    function start(event: GestureEvent) {
        cancel()
        if (event.type.startsWith('touch')) {
            recordTouch(now())
            if (event.touches && event.touches.length !== 1) return
            pressed = 'touch'
            origin = event.touches?.[0]
        } else if (event.type === 'mousedown' && (event.button === undefined || event.button === 0) && !isCompatibilityMouse(event, now())) {
            pressed = 'mouse'
        }
    }

    function move(event: GestureEvent) {
        const point = event.touches?.[0]
        if (pressed === 'touch' && origin && point &&
            (Math.abs(point.clientX - origin.clientX) > 8 || Math.abs(point.clientY - origin.clientY) > 8)) cancel()
    }

    function end(event: GestureEvent) {
        const touch = event.type.startsWith('touch')
        if (touch) recordTouch(now())
        const shouldClose = (touch && pressed === 'touch') ||
            (event.type === 'mouseup' && pressed === 'mouse' && (event.button === undefined || event.button === 0))
        cancel()
        if (shouldClose) close()
    }

    return {start, move, end, cancel}
}
