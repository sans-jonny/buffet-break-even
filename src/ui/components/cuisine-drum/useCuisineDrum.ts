import {computed, type MaybeRefOrGetter, ref, type Ref, toValue, watch} from 'vue'

export function useCuisineDrum(ids: readonly string[],
                               selected: Ref<string>,
                               viewportWidth: MaybeRefOrGetter<number>,
                               now = () => Date.now()) {
    type GestureEvent = {
        type?: string;
        button?: number;
        clientX?: number;
        clientY?: number;
        touches?: ArrayLike<{ clientX: number; clientY: number }>;
        changedTouches?: ArrayLike<{ clientX: number; clientY: number }>
    }
    const count = ids.length
    const activeIndex = computed(() => Math.max(0, ids.indexOf(selected.value)))
    const position = ref(activeIndex.value)
    const dragging = ref(false)
    let startX = 0, startY = 0, startPosition = 0, moved = false
    let ignoreMouseUntil = 0, suppressTapUntil = 0
    let direction: 'horizontal' | 'vertical' | null = null
    let pixelsPerCard = 131, lastX = 0, lastTime = 0, velocity = 0
    const wrap = (index: number) => ((index % count) + count) % count
    const point = (event: GestureEvent) => event.touches?.[0] || event.changedTouches?.[0] || {
        clientX: event.clientX || 0,
        clientY: event.clientY || 0
    }

    function snapPosition() {
        const delta = position.value - startPosition
        const momentum = now() - lastTime < 100 ? Math.max(-.4, Math.min(.4, -velocity * 80 / pixelsPerCard)) : 0
        const projected = delta + momentum
        const steps = Math.abs(projected) >= .28 ? Math.sign(projected) * Math.max(1, Math.round(Math.abs(projected))) : 0
        return Math.round(startPosition + steps)
    }

    // Preview the same destination used on release, without changing the selected cuisine.
    const highlightedIndex = computed(() => count ? wrap(dragging.value && moved ? snapPosition() : Math.round(position.value)) : 0)

    function choose(index: number) {
        if (!count || Date.now() < suppressTapUntil) return
        const current = Math.round(position.value)
        const distance = wrap(index - wrap(current) + Math.floor(count / 2)) - Math.floor(count / 2)
        position.value = current + distance
        selected.value = ids[wrap(position.value)]
    }

    function begin(event: GestureEvent) {
        if (event.type?.startsWith('touch')) ignoreMouseUntil = Date.now() + 800
        if (event.type?.startsWith('mouse') && (Date.now() < ignoreMouseUntil || (event.button !== undefined && event.button !== 0))) return
        if (!count) return
        const p = point(event)
        startX = p.clientX;
        startY = p.clientY;
        startPosition = position.value
        // Read current width on every gesture; keep its scale fixed until release to avoid resize jumps.
        const width = toValue(viewportWidth)
        pixelsPerCard = Math.min(280, Math.max(110, (Number.isFinite(width) && width > 0 ? width : 375) * .35))
        direction = null;
        lastX = startX;
        lastTime = now();
        velocity = 0
        moved = false;
        dragging.value = true
    }

    function move(event: GestureEvent) {
        if (!dragging.value || (event.type?.startsWith('mouse') && Date.now() < ignoreMouseUntil)) return
        const p = point(event), dx = p.clientX - startX, dy = p.clientY - startY
        if (!direction && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
            direction = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
        }
        if (direction !== 'horizontal') return
        moved = true
        const time = now(), elapsed = time - lastTime
        if (p.clientX !== lastX) {
            if (elapsed > 0) velocity = (p.clientX - lastX) / elapsed
            lastX = p.clientX;
            lastTime = time
        }
        position.value = startPosition - dx / pixelsPerCard
    }

    function end(event?: GestureEvent) {
        if (!dragging.value || (event?.type?.startsWith('mouse') && Date.now() < ignoreMouseUntil)) return
        const cancelled = event?.type === 'touchcancel'
        if (!cancelled && (event?.changedTouches?.length || event?.type === 'mouseup')) move(event)
        dragging.value = false
        if (moved && !cancelled) {
            // Give quick flicks a small push; pausing before release removes that momentum.
            position.value = snapPosition()
            suppressTapUntil = Date.now() + 300
        } else position.value = Math.round(startPosition)
        selected.value = ids[wrap(position.value)]
    }

    watch(selected, () => {
        if (!dragging.value && ids[wrap(Math.round(position.value))] !== selected.value) choose(activeIndex.value)
    })

    return {
        activeIndex, highlightedIndex, position, dragging, choose, begin, move, end,
        rotation: computed(() => `translateZ(calc(-1 * var(--drum-radius))) rotateY(${-position.value * 360 / Math.max(count, 1)}deg)`)
    }
}
