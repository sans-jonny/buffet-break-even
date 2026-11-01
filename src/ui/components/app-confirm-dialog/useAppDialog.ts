import {shallowRef} from 'vue'

type DialogResult = { confirm: boolean; cancel: boolean }
type DialogOptions = {
    title: string
    content: string
    confirmText?: string
    cancelText?: string
    confirmColor?: string
    success?: (result: DialogResult) => void | Promise<void>
}

/** Page-local confirmation state. Dismiss before callbacks to prevent duplicate actions. */
export function useAppDialog() {
    const dialog = shallowRef<DialogOptions | null>(null)

    function open(options: DialogOptions) {
        if (!dialog.value) dialog.value = options
    }

    function respond(confirm: boolean) {
        const current = dialog.value
        if (!current) return
        dialog.value = null
        return current.success?.({confirm, cancel: !confirm})
    }

    // Closing the window has no business meaning; only explicit buttons invoke callbacks.
    function close() {
        dialog.value = null
    }

    return {dialog, open, close, confirm: () => respond(true), cancel: () => respond(false)}
}

export type AppDialogController = ReturnType<typeof useAppDialog>
