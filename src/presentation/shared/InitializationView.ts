export type InitializationView =
    | {status: 'idle'; message: ''}
    | {status: 'ready'; message: ''}
    | {status: 'error'; message: string}
