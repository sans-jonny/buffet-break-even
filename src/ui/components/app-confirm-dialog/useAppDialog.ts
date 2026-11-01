import {shallowRef} from 'vue'

export function useAppDialog() {
    type DialogResult = { confirm: boolean; cancel: boolean }

    const dialog = shallowRef<useAppDialog.Options | null>(null)

    function open(options: useAppDialog.Options) {
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

export namespace useAppDialog {

    export type Result = { confirm: boolean; cancel: boolean }
    export type Options = {
        title: string
        content: string
        confirmText?: string
        cancelText?: string
        confirmColor?: string
        success?: (result: Result) => void | Promise<void>
    }
    export type Controller = ReturnType<typeof useAppDialog>
}
