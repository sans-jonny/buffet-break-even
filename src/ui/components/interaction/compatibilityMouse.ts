export namespace compatibilityMouse {
    type InputEvent = { type?: string; sourceCapabilities?: { firesTouchEvents?: boolean } }
    let ignoreMouseUntil = 0

    /** Touch releases may synthesize a new mousedown/click on an element that just appeared. */
    export function recordTouch(now = Date.now()) {
        ignoreMouseUntil = now + 800
    }

    export function isCompatibilityMouse(event?: InputEvent, now = Date.now()) {
        return Boolean(event?.type?.startsWith('mouse') &&
            (event.sourceCapabilities?.firesTouchEvents || now < ignoreMouseUntil))
    }

}
