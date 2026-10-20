export interface ApplicationView {
    present(viewModel: ApplicationView.ViewModel): void
}

export namespace ApplicationView {
    export type ViewModel =
        | {status: 'idle'; message: ''}
        | {status: 'ready'; message: ''}
        | {status: 'error'; message: string}
}
