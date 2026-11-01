import {getCurrentScope, nextTick, onScopeDispose, ref} from 'vue'

export function usePressFeedback() {
    type PressEvent = { type?: string; button?: number }
    type AnimationEvent = {
        animationName?: string;
        detail?: { animationName?: string };
        target?: unknown;
        currentTarget?: unknown
    }
    const phase = ref<'idle' | 'pressing' | 'held' | 'releasing'>('idle')
    let down = false
    let ignoreMouseUntil = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let generation = 0

    function clearPending() {
        generation++
        if (timer !== undefined) clearTimeout(timer)
        timer = undefined
    }

    function finish(expected: 'pressing' | 'releasing') {
        if (phase.value !== expected) return
        changePhase(expected === 'pressing' ? (down ? 'held' : 'releasing') : 'idle')
    }

    function changePhase(next: typeof phase.value) {
        clearPending()
        phase.value = next
        if (next !== 'pressing' && next !== 'releasing') return
        const current = generation
        // Mini-programs may omit animationend. Start the fallback after rendering,
        // allowing two frames for the CSS animation to start and finish.
        void nextTick(() => {
            if (generation !== current) return
            timer = setTimeout(() => {
                if (generation === current) finish(next)
            }, usePressFeedback.PRESS_ANIMATION_MS + 32)
        })
    }

    if (getCurrentScope()) onScopeDispose(clearPending)

    function accepts(event?: PressEvent) {
        if (event?.type?.startsWith('touch')) ignoreMouseUntil = Date.now() + 800
        return !event?.type?.startsWith('mouse') || (Date.now() >= ignoreMouseUntil && (event.button === undefined || event.button === 0))
    }

    function press(event?: PressEvent) {
        if (!accepts(event)) return
        down = true
        if (phase.value === 'idle' || phase.value === 'releasing') changePhase('pressing')
    }

    function release(event?: PressEvent) {
        if (!accepts(event)) return
        down = false
        if (phase.value === 'held') changePhase('releasing')
    }

    function animationEnd(event: AnimationEvent) {
        // Mini-program target/currentTarget are separate objects even for the same node.
        const targetId = (event.target as { id?: string } | undefined)?.id
        const currentId = (event.currentTarget as { id?: string } | undefined)?.id
        if (targetId && currentId && targetId !== currentId) return
        const name = event.animationName || event.detail?.animationName || ''
        if (phase.value === 'pressing' && (!name || name.includes('press-in'))) {
            finish('pressing')
        } else if (phase.value === 'releasing' && (!name || name.includes('press-out'))) {
            finish('releasing')
        }
    }

    return {phase, press, release, animationEnd}
}

export namespace usePressFeedback {
    export const PRESS_ANIMATION_MS = 120
}
