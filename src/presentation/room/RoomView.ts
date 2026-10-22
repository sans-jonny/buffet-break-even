import type {RoomViewModel} from './RoomViewModel'

/** Presenter 的展示输出契约，由 UI Store 实现。 */
export interface RoomView {
    present(view: RoomViewModel): void
}
